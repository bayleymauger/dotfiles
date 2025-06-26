-- nvim-ts-context-commentstring
-- https://github.com/JoosepAlviste/nvim-ts-context-commentstring

return {
	{
		"JoosepAlviste/nvim-ts-context-commentstring",
		opts = {},
		config = function()
			require("ts_context_commentstring").setup({
				enable_autocmd = false,
			})
		end,
	},
}
