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
          // conventional-changelog passes a read-only commit, so return a copy instead of mutating it.
          // Make sure chore commits are included
          const typeLabels: Record<string, string> = {
            feat: '✨ Features',
            fix: '🐛 Bug Fixes',
            chore: '🔧 Chores',
            refactor: '♻️ Refactoring',
          };
          const type = Object.prototype.hasOwnProperty.call(typeLabels, commit.type)
            ? typeLabels[commit.type]
            : undefined;
          if (!type) {
            return; // Hide other types
          }

          return { ...commit, type, subject: commit.header };
        },
      },
    },
  },
};

export default config;

