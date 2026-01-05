import type { Config } from 'release-it';

const config: Config = {
  git: {
    commitMessage: 'chore(release): v${version}',
    tagName: 'v${version}',
    requireBranch: false,
    requireCleanWorkingDir: false,
    push: false,
    commit: true,
    tag: false,
  },
  github: {
    release: false,
    releaseName: 'v${version}',
    draft: false,
    preRelease: false,
  },
  npm: {
    publish: false,
  },
  hooks: {
    'before:init': ['npm run build'],
    'after:release': 'echo Successfully prepared release v${version}',
  },
  plugins: {
    '@release-it/conventional-changelog': {
      preset: 'angular',
      infile: 'CHANGELOG.md',
    },
  },
};

export default config;

