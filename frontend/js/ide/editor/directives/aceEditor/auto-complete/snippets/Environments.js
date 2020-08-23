// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const envs = [
  'abstract',
  'align',
  'align*',
  'aligned',
  'alignedat',
  'equation',
  'equation*',
  'gather',
  'gather*',
  'gathered',
  'flalign',
  'flalign*',
  'multline',
  'multline*',
  'split',
  'verbatim',
  'quote',
  'center',
  'matrix',
  'bmatrix',
  'Bmatrix',
  'pmatrix',
  'vmatrix',
  'Vmatrix',
]

const envsWithSnippets = [
  'array',
  'figure',
  'tabular',
  'table',
  'list',
  'enumerate',
  'itemize',
  'frame',
  'thebibliography',
]

export default {
  all: envs.concat(envsWithSnippets),
  withoutSnippets: envs,
}
