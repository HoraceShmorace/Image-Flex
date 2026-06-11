build-GetOrCreateImageFunction:
	npm install --include=dev
	./node_modules/.bin/esbuild index.mts \
		--bundle \
		--format=esm \
		--target=node22 \
		--platform=node \
		--outfile=$(ARTIFACTS_DIR)/index.mjs \
		--external:sharp \
		--banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" \
		--minify
	npm install --prefix $(ARTIFACTS_DIR) --no-save --omit=dev --include=optional \
		--os=linux --cpu=x64 --libc=glibc \
		sharp@^0.33.5
	rm -f $(ARTIFACTS_DIR)/package.json $(ARTIFACTS_DIR)/package-lock.json
