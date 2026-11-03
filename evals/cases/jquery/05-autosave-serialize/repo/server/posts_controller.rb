class PostsController < ApplicationController
  def autosave
    post = Post.find(params[:id])
    post.update!(params.require(:post).permit(:title, :body, tags: []))  # expects Rails-style nested form params
    head :ok
  end
end
