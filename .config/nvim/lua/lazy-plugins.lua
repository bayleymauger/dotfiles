-- [[ Configure and install plugins ]]
--
--  To check the current status of your plugins, run
--    :Lazy
--
--  You can press `?` in this menu for help. Use `:q` to close the window
--
--  To update plugins you can run
--    :Lazy update
--
-- NOTE: Here is where you install your plugins.
require("lazy").setup({
	-- NOTE: Plugins can also be added by using a table,
	-- with the first argument being the link and the following
	-- keys can be used to configure plugin behavior/loading/etc.
	--
	-- Use `opts = {}` to automatically pass options to a plugin's `setup()` function, forcing the plugin to be loaded.
	--

	-- modular approach: using `require 'path.name'` will
	-- include a plugin definition from file lua/path/name.lua
	require("plugins.indent"),
	require("plugins.tmux"),
	require("plugins.ts-comments"),
	require("plugins.comment"),
	require("plugins.gitsigns"),
	require("plugins.lualine"),
	require("plugins.which-key"),
	require("plugins.telescope"),
	require("plugins.harpoon"),
	require("plugins.lspconfig"),
	require("plugins.conform"),
	require("plugins.ufo"),
	require("plugins.cmp"),
	require("plugins.undo-tree"),
	require("plugins.todo-comments"),
	require("plugins.mini"),
	require("plugins.treesitter"),
	require("plugins.debug"),
	require("plugins.trouble"),
	require("plugins.indent-blankline"),
	require("plugins.lint"),
	require("plugins.autopairs"),
	require("plugins.autotag"),
	require("plugins.oil"),
	require("plugins.lazygit"),
	require("plugins.copilot"),
	require("plugins.code-companion"),
	require("plugins.theme"),
}, {
	ui = {
		-- If you are using a Nerd Font: set icons to an empty table which will use the
		-- default lazy.nvim defined Nerd Font icons, otherwise define a unicode icons table
		icons = vim.g.have_nerd_font and {} or {
			cmd = "⌘",
			config = "🛠",
			event = "📅",
			ft = "📂",
			init = "⚙",
			keys = "🗝",
			plugin = "🔌",
			runtime = "💻",
			require = "🌙",
			source = "📄",
			start = "🚀",
			task = "📌",
			lazy = "💤 ",
		},
	},
})
