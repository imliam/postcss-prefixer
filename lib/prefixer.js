const postcss = require('postcss');
const Tokenizer = require('css-selector-tokenizer');
const comma = postcss.list.comma;

const {
  parseAttrSelector,
  attrStringify,
  itMatchsOne,
} = require('./utils');

const parseNode = (node, prefix, suffix) => {
  if (['class', 'id'].includes(node.type)) {
    return Object.assign({}, node, { name: `${prefix}${node.name}${suffix}` });
  }

  if (['attribute'].includes(node.type) && node.content) {
    const { type, operator, name } = parseAttrSelector(node);

    if (!['class', 'id'].includes(type)) return node;

    return Object.assign({}, node, {
      content: attrStringify({
        type,
        operator,
        name: `${prefix}${name}${suffix}`,
      }),
    });
  }

  return node;
};

const interateSelectorNodes = (selector, options) =>
  Object.assign({}, selector, {
    nodes: selector.nodes.map((node) => {
      if (['selector', 'nested-pseudo-class'].includes(node.type)) {
        return interateSelectorNodes(node, options);
      }

      if (itMatchsOne(options.ignore, Tokenizer.stringify(node))) return node;

      return parseNode(node, options.prefix, options.suffix);
    }),
  });


const prefixer = options => (css) => {
  const { prefix, suffix, state, variant, ignore } = Object.assign({}, {
    prefix: '',
    suffix: '',
    state: '',
    variant: false,
    ignore: [],
  }, options);

  if (typeof prefix !== 'string') {
    throw new Error('@postcss-prefix: prefix option should be of type string.');
  }

  if (typeof suffix !== 'string') {
    throw new Error('@postcss-prefix: suffix option should be of type string.');
  }

  if (typeof state !== 'string') {
    throw new Error('@postcss-prefix: state option should be of type string.');
  }

  if (!Array.isArray(ignore)) {
    throw new Error('@postcss-prefix: ignore options should be an Array.');
  }

  if (!prefix.length && !suffix.length && !state.length) return;

  css.walkRules((rule) => {
    const { selector } = rule;

    let newSelector = Tokenizer.stringify(interateSelectorNodes(
      Tokenizer.parse(selector),
      { prefix, suffix, ignore },
    )) + state;

    if (state != ':hover' && state.length) {
      // throw new Error('ooh')
    }

    if (variant) {
      //   const newRule = rule.clone({ selector: newSelector })
      //   rule.insertBefore(newRule)
      newSelector = `${rule.selector}, ${newSelector}`
    }


    rule.selector = newSelector
  });
};

module.exports = postcss.plugin('postcss-prefixer', prefixer);
