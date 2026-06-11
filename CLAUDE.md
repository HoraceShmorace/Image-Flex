# Image-Flex

Lambda@Edge image-resizing service. CloudFront + S3 + WAF + two Lambdas (UriToS3Key on viewer-request, GetOrCreateImage on origin-response). Provisioned via SAM/CloudFormation.

## Toolchain

- TypeScript sources are `.mts`, compiled to `.mjs` ESM bundles by esbuild.
- `UriToS3KeyFunction` uses SAM's native `BuildMethod: esbuild` (no native deps).
- `GetOrCreateImageFunction` uses `BuildMethod: makefile` (see `src/GetOrCreateImage/Makefile`) because it depends on `sharp`, which has platform-specific native binaries.
- Tests use Jest with `@swc/jest` and `--experimental-vm-modules` for ESM.
- Deployments use `sam deploy --resolve-s3` — SAM manages its own artifact bucket; there is no `setup` step and no manually created deploy bucket.

## Pitfalls

### SAM `BuildMethod: esbuild` does not ship `node_modules` for `External` packages <!-- 2026-05-27 -->
**Symptom:** Bundling `sharp` with esbuild's `External: [sharp]` produces an
`index.mjs` containing `from"sharp"` but the build artifact has no
`node_modules/sharp` — Lambda fails at runtime with module-not-found.
**Rule:** When a function has a native dep that must be externalized, use
`BuildMethod: makefile` with a custom Makefile target that (1) runs `npm
install` and (2) installs the externalized dep INTO the artifact dir via
`npm install --prefix $(ARTIFACTS_DIR)` so its full transitive tree ships.
Do NOT cherry-pick folders (`cp -R node_modules/sharp`) — sharp also
requires `detect-libc`, `semver`, and `color` at runtime, and missing any
of them fails init with `Runtime.ImportModuleError` (surfaces as a
CloudFront 503 "Lambda function is invalid"; logs land in the edge region,
e.g. us-west-1, under `/aws/lambda/us-east-1.<fn-name>`). SAM's esbuild
builder emits only the bundle + sourcemap; it never ships externals.
**Why:** SAM's `NodejsNpmEsbuildBuilder` is bundle-only by design. Externals
are assumed to be supplied at runtime (e.g., the Lambda runtime SDK) or via
a Lambda Layer.

### AWS SDK v3 does not follow S3 region redirects from Lambda@Edge <!-- 2026-06-10 -->
**Symptom:** `GetOrCreateImage` returns 404 with body
`PermanentRedirect: The bucket you are attempting to access must be
addressed using the specified endpoint` when invoked at an edge location
outside us-east-1.
**Rule:** Never use `new S3Client({})` in Lambda@Edge code. The replica's
default region is wherever the edge ran (e.g. us-west-1), not the bucket's
region. Pin the client to `event...origin.s3.region` (cache clients
per-region at module scope).
**Why:** SDK v2 auto-followed S3's 301 region redirects; SDK v3 surfaces
them as errors.

### esbuild ESM bundles of CJS deps need a `createRequire` banner <!-- 2026-06-10 -->
**Symptom:** Lambda init fails with `Error: Dynamic require of "buffer" is
not supported` when the ESM bundle includes CJS dependencies
(`aws-xray-sdk-core`, parts of AWS SDK v3) that `require()` Node built-ins
at runtime.
**Rule:** Pass
`--banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"`
to esbuild for any `--format=esm` Lambda bundle containing CJS deps. Before
deploying, smoke-test module init locally:
`node -e "import('./index.mjs').then(() => console.log('INIT OK'))"`
(install a host-platform `sharp` next to it first). This catches init
errors in seconds instead of a 15-minute deploy + edge-propagation cycle.
**Why:** esbuild's ESM output defines a `__require` shim that throws unless
a real `require` exists in scope; the banner provides one.

### `sharp` on Lambda Linux from a macOS host requires explicit npm platform flags <!-- 2026-05-27 -->
**Symptom:** Default `npm install sharp` on a darwin-arm64 dev machine fetches
darwin-arm64 binaries; deploying to Lambda fails because the runtime is
linux-x64.
**Rule:** Install sharp with `npm install --include=optional --os=linux
--cpu=x64 --libc=glibc`. The `--include=optional` flag is required to pull
in sharp's platform-specific optionalDependencies (`@img/sharp-linux-x64`,
`@img/sharp-libvips-linux-x64`). The Makefile target handles this — do not
deploy from a host where these flags weren't applied.
**Why:** sharp 0.33+ ships native bindings as `optionalDependencies` keyed
to OS/CPU/libc. npm filters them by the running platform unless told
otherwise.

### SAM esbuild `Sourcemap: true` is incompatible with Lambda@Edge <!-- 2026-05-27 -->
**Symptom:** Distribution creation fails with `The function cannot have
environment variables` even though the SAM template declares no
`Environment` block.
**Rule:** Set `Sourcemap: false` in `BuildProperties` for every Lambda@Edge
function built with `BuildMethod: esbuild`. For Makefile-built functions,
do not pass `--sourcemap` to esbuild.
**Why:** When `Sourcemap: true`, SAM auto-injects `NODE_OPTIONS:
--enable-source-maps` as a function environment variable so the source map
is honored at runtime. Lambda@Edge forbids any environment variables, so
CloudFront refuses to associate the function with a distribution. The SAM
build log warns about this (`Sourcemap set without --enable-source-maps,
adding ... to function NODE_OPTIONS`) — treat that warning as an error for
Edge functions.

### `.mts` files require trailing-comma generics <!-- 2026-05-27 -->
**Symptom:** `tsc` errors `TS7060: This syntax is reserved in files with the
.mts or .cts extension. Add a trailing comma or explicit constraint.` on
arrow functions like `const f = <T>(x: T): T => x`.
**Rule:** Write `<T,>` (trailing comma) or `<T extends unknown>` (explicit
constraint) in `.mts`/`.cts` files.
**Why:** TS reserves `<T>(...)` in `.mts`/`.cts` to keep parsing
unambiguous with JSX-like syntax.
