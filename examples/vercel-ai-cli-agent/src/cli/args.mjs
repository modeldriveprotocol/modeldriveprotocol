export function normalizeArgv(argv) {
  if (argv[0] === '--') {
    return argv.slice(1)
  }

  return argv
}

export function renderHelpText() {
  return [
    'Usage: mdp-test <command>',
    '',
    'Commands:',
    '  get-package-version     Call the MDP runtime and print the root package version',
    '  调用get-package-version  Chinese alias for the same mocked intent'
  ].join('\n')
}
