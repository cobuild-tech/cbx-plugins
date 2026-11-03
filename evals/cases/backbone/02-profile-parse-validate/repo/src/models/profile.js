app.Profile = Backbone.Model.extend({
  urlRoot: '/api/profile',
  parse: function (resp) { return resp.data ? resp.data.attributes : resp; },
  validate: function (attrs) {
    if (!attrs.displayName || attrs.displayName.length > 40) return 'Display name must be 1-40 characters';
    if (attrs.website && !/^https?:\/\//.test(attrs.website)) return 'Website must start with http(s)://';
  },
  toJSON: function () { return { data: { type: 'profiles', attributes: _.clone(this.attributes) } }; }
});
