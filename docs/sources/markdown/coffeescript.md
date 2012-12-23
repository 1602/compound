# CoffeeScript apps

Almost all parts of your app can be written in CoffeeScript. If you like coding in Coffee, please do. Just add the `--coffee` option to all `compound` commands.

```
compound init blog --coffee
cd blog
npm install -l
compound g scaffold post title content --coffee
```

Afterwards, you can run `compound server` or `coffee server.coffee` to start your server on port 3000.

For example, here is a generated CoffeeScript controller:

```
before ->
    Post.findById req.params.id, (err, post) =>
        if err or not post
            redirect path_to.posts
        else
            @post = post
            next()
, only: ['show', 'edit', 'update', 'destroy']

# GET /posts/new
action 'new', ->
    @post = new Post
    render
        title: 'New post'
        
# POST /posts
action 'create', ->
    @post = new Post
    ['title', 'content'].forEach (field) =>
        @post[field] = req.body[field] if req.body[field]?
        
    @post.save (errors) ->
        if errors
            flash 'error', 'Post can not be created'
            render 'new',
                title: 'New post'
        else
            flash 'info', 'Post created'
            redirect path_to.posts
            
# GET /posts
action 'index', ->
    Post.find (err, posts) ->
        render
            posts: posts
            title: 'Posts index'
            
# GET /posts/:id
action 'show', ->
    render
        title: 'Post show'
        
# GET /posts/:id/edit
action 'edit', ->
    render
        title: 'Post edit'
        
# PUT /posts/:id
action 'update', ->
    ['title', 'content'].forEach (field) =>
        @post[field] = req.body[field] if req.body[field]?
        
    @post.save (err) =>
        if not err
            flash 'info', 'Post updated'
            redirect path_to.post(@post)
        else
            flash 'error', 'Post can not be updated'
            render 'edit',
                title: 'Edit post details'
                
# DELETE /posts/:id
action 'destroy', ->
    @post.remove (error) ->
        if error
            flash 'error', 'Can not destroy post'
        else
            flash 'info', 'Post successfully removed'
        send "'" + path_to.posts + "'"
        
```

