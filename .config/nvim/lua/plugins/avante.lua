-- avante.nvim
-- https://github.com/yetone/avante.nvim

vim.pack.add {
  'https://github.com/nvim-lua/plenary.nvim',
  'https://github.com/MunifTanjim/nui.nvim',
  'https://github.com/MeanderingProgrammer/render-markdown.nvim',
  'https://github.com/yetone/avante.nvim',
}

require('render-markdown').setup { file_types = { 'markdown', 'Avante' } }

require('avante').setup {
  provider = 'claude-code',
  acp_providers = {
    ['claude-code'] = {
      -- Spawn via a login shell so nvm resolves whichever node version is
      -- currently default/active, instead of relying on nvim's PATH, which
      -- is fixed at the time nvim (or its parent shell) was launched.
      command = 'zsh',
      args = { '-lc', 'exec claude-agent-acp "$@"', '--' },
      env = {
        NODE_NO_WARNINGS = '1',
        ANTHROPIC_API_KEY = os.getenv 'ANTHROPIC_API_KEY',
      },
    },
  },
}

vim.keymap.set('n', '<leader>aA', '<cmd>AvanteAsk<cr>', { desc = 'Avante Ask' })
vim.keymap.set('v', '<leader>aA', '<cmd>AvanteAsk<cr>', { desc = 'Avante Ask (selection)' })
vim.keymap.set('n', '<leader>aE', '<cmd>AvanteEdit<cr>', { desc = 'Avante Edit' })
vim.keymap.set('n', '<leader>aT', '<cmd>AvanteToggle<cr>', { desc = 'Avante Toggle' })
vim.keymap.set('n', '<leader>aC', '<cmd>AvanteClear<cr>', { desc = 'Avante Clear' })
