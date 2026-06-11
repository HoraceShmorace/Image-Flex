import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

export const loadFixture = <T,>(name: string): T =>
  JSON.parse(readFileSync(resolve(here, name), 'utf8')) as T
