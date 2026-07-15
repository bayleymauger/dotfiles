-- oil
-- https://github.com/stevearc/oil.nvim

vim.pack.add {
  'https://github.com/stevearc/oil.nvim',
}

require('oil').setup {
  view_options = {
    show_hidden = true,
  },
  keymaps = {
    ['g?'] = { 'actions.show_help', mode = 'n' },
    ['<CR>'] = 'actions.select',
    ['<C-s>'] = false,
    ['<C-h>'] = false,
    ['<C-t>'] = false,
    ['<C-p>'] = 'actions.preview',
    ['<C-c>'] = { 'actions.close', mode = 'n' },
    ['<C-r>'] = 'actions.refresh',
    ['-'] = { 'actions.parent', mode = 'n' },
    ['_'] = { 'actions.open_cwd', mode = 'n' },
    ['`'] = { 'actions.cd', mode = 'n' },
    ['~'] = { 'actions.cd', opts = { scope = 'tab' }, mode = 'n' },
    ['gs'] = { 'actions.change_sort', mode = 'n' },
    ['gx'] = 'actions.open_external',
    ['g.'] = { 'actions.toggle_hidden', mode = 'n' },
    ['g\\'] = { 'actions.toggle_trash', mode = 'n' },
  },
  use_default_keymaps = false,
}

vim.keymap.set('n', '\\', ':lua require("oil").open()<CR>', { noremap = true, silent = true })
