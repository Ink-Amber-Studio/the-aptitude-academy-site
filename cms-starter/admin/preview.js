/* global CMS, createClass, h */
CMS.registerPreviewStyle('./preview.css');

var PostPreview = createClass({
  render: function () {
    var entry = this.props.entry;
    var data = entry.get('data');
    var image = data.get('cover');
    var cover = image ? this.props.getAsset(image) : null;
    var title = data.get('title') || 'Untitled post';
    var summary = data.get('summary') || 'Add a short introduction to help readers understand what this post is about.';
    var author = data.get('author') || 'The Aptitude Academy';
    return h('article', { className: 'taa-preview' },
      h('p', { className: 'taa-preview-kicker' }, 'The Aptitude Academy / Blog'),
      h('h1', {}, title),
      h('p', { className: 'taa-preview-meta' }, author),
      h('p', { className: 'taa-preview-summary' }, summary),
      cover ? h('img', { className: 'taa-preview-cover', src: cover.toString(), alt: data.get('cover_alt') || '' }) : null,
      h('div', { className: 'taa-preview-body' }, this.props.widgetFor('body'))
    );
  }
});

CMS.registerPreviewTemplate('posts', PostPreview);
