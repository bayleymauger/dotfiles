-- oil
-- https://github.com/stevearc/oil.nvim

vim.pack.add {
  'https://github.com/stevearc/oil.nvim',
}

require('oil').setup {
  view_options = {
    show_hidden = true,
  },
}

vim.keymap.set('n', '\\', ':lua require("oil").open()<CR>', { noremap = true, silent = true })
