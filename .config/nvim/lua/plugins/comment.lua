-- Comment.nvim
-- https://github.com/numToStr/Comment.nvim

return {
	"numToStr/Comment.nvim",
	opts = {},
	config = function()
		require("Comment").setup({
			pre_hook = require("ts_context_commentstring.integrations.comment_nvim").create_pre_hook(),
		})
	end,
}
