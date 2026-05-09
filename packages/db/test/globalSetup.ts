import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(__dirname, '..')
const TEST_DB_URL = 'postgresql://aidevflow:aidevflow@localhost:5432/aidevflow_test'

export default async function setup() {
  try {
    execSync('npx prisma migrate deploy', {
      cwd: pkgRoot,
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'pipe'
    })
  } catch {
    // No migration files yet — tests will fail with table-not-found (Red phase of TDD)
  }
}
