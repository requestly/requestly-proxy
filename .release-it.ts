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
      parserOpts: {
        headerPattern: /^(?:\[(.*)\]\s*)?(\w*)(?:\((.*)\))?: (.*)$/,
        headerCorrespondence: ['ticket', 'type', 'scope', 'subject'],
      },
      writerOpts: {
        transform: (commit: any) => {
          // Make sure chore commits are included
          if (commit.type === 'feat') {
            commit.type = '✨ Features';
          } else if (commit.type === 'fix') {
            commit.type = '🐛 Bug Fixes';
          } else if (commit.type === 'chore') {
            commit.type = '🔧 Chores';
          } else if (commit.type === 'refactor') {
            commit.type = '♻️ Refactoring';
          } else {
            return; // Hide other types
          }
          
          commit.subject = commit.header
          
          return commit;
        },
      },
    },
  },
};

export default config;

