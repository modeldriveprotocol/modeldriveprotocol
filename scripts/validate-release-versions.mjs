import { readFileSync } from 'node:fs'

const tagName = process.argv[2]

if (!tagName) {
  console.error('Usage: node scripts/validate-release-versions.mjs <tag-name>')
  process.exit(1)
}

const expectedVersion = tagName.startsWith('v') ? tagName.slice(1) : tagName

const checks = [
  {
    path: 'packages/protocol/package.json',
    read: readJsonVersion
  },
  {
    path: 'packages/client/package.json',
    read: readJsonVersion
  },
  {
    path: 'packages/server/package.json',
    read: readJsonVersion
  },
  {
    path: 'apps/browser-simple-mdp-client/package.json',
    read: readJsonVersion
  },
  {
    path: 'apps/nodejs-simple-mdp-client/package.json',
    read: readJsonVersion
  },
  {
    path: 'sdks/python/pyproject.toml',
    read: (source) => readTomlKey(source, 'version')
  },
  {
    path: 'sdks/rust/Cargo.toml',
    read: (source) => readTomlKey(source, 'version')
  },
  {
    path: 'sdks/jvm/gradle.properties',
    read: (source) => readPropertiesKey(source, 'version')
  },
  {
    path: 'sdks/dotnet/Directory.Build.props',
    read: (source) => readXmlTag(source, 'Version')
  }
]

for (const check of checks) {
  const source = readFileSync(check.path, 'utf8')
  const version = check.read(source)
  if (version !== expectedVersion) {
    console.error(
      `${check.path} has version ${version ?? '<missing>'} but tag expects ${expectedVersion}.`
    )
    process.exit(1)
  }
}

process.stdout.write(expectedVersion)

function readJsonVersion(source) {
  return JSON.parse(source).version
}

function readTomlKey(source, key) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"$`, 'm'))
  return match?.[1]
}

function readPropertiesKey(source, key) {
  const match = source.match(new RegExp(`^${key}=([^\\n]+)$`, 'm'))
  return match?.[1]?.trim()
}

function readXmlTag(source, tagName) {
  const match = source.match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`))
  return match?.[1]?.trim()
}
