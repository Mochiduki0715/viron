const compact = require('mout/array/compact');
const isEmpty = require('mout/lang/isEmpty');

const shared = require('../../shared');
const context = shared.context;
const constant = shared.constant;

const genComponent = (name, method, path, style, pagination, options) => {
  return {
    name,
    api: {
      path,
      method,
    },
    style,
    pagination: !!pagination,
    options: options || {
      key: 'key',
      value: 'value',
    },
  };
};

const genTableComponent = (name, method, path, query, labels) => {
  return Object.assign({
    query,
    table_labels: labels,
  }, genComponent(name, method, path, constant.DMC_STYLE_TABLE, true));
};

const genPage = (section, group, id, name, components) => {
  return {
    id,
    name,
    section,
    components,
    group,
  };
};

const genGroup = (section, group) => {
  const groupNames = Object.keys(group);
  let list = [];
  groupNames.forEach(groupName => {
    const pages = group[groupName];
    list = list.concat(pages.map(page => {
      return genPage(section, groupName, page.id, page.name, page.components);
    }));
  });
  return list;
};

const genSection = (section, groups) => {
  let list = [];
  groups.forEach(group => {
    list = list.concat(genGroup(section, group));
  });
  return list;
};

/**
 * GET: /dmc
 */
const show = (req, res) => {
  const dmclib = context.getDmcLib();
  const helperAdminRole = dmclib.adminRole.helper;

  const result = {
    name: 'DMC Example Project for Node.js',
    color: 'white',
    thumbnail: 'https://avatars3.githubusercontent.com/u/23251378?v=3&s=200',
    tags: ['develop', 'dmc', 'example'],
    pages: [].concat(
      // QuickView
      genSection(constant.DMC_SECTION_DASHBOARD, [
        {
          [constant.GROUP_EMPTY]: [
            {
              id: 'quickview',
              name: 'クイックビュー',
              components: [
                genComponent('DAU', 'get', '/stats/dau', constant.DMC_STYLE_NUMBER),
                genComponent('MAU', 'get', '/stats/mau', constant.DMC_STYLE_NUMBER),
                genComponent('Planet(bar)', 'get', '/stats/planet/bar', constant.DMC_STYLE_GRAPH_BAR),
                genComponent('Planet(scatterplot)', 'get', '/stats/planet/scatterplot', constant.DMC_STYLE_GRAPH_SCATTERPLOT),
                genComponent('Planet(line)', 'get', '/stats/planet/line', constant.DMC_STYLE_GRAPH_LINE),
                genComponent('Planet(horizontal-bar)', 'get', '/stats/planet/horizontal-bar', constant.DMC_STYLE_GRAPH_HORIZONTAL_BAR),
                genComponent('Planet(stacked-bar)', 'get', '/stats/planet/stacked-bar', constant.DMC_STYLE_GRAPH_STACKED_BAR),
                genComponent('Planet(horizontal-stacked-bar)', 'get', '/stats/planet/horizontal-stacked-bar', constant.DMC_STYLE_GRAPH_HORIZONTAL_STACKED_BAR),
                genComponent('Planet(stacked-area)', 'get', '/stats/planet/stacked-area', constant.DMC_STYLE_GRAPH_STACKED_AREA),
              ],
            }
          ],
        },
      ]),
      genSection(constant.DMC_SECTION_MANAGE, [
        {
          // Manage
          [constant.GROUP_USER]: [
            {
              id: 'user',
              name: 'ユーザ',
              components: [
                genTableComponent('ユーザ', 'get', '/user', [{key: 'name', type: 'string'}], ['id', 'name']),
              ],
            },
            {
              id: 'userblog',
              name: 'ユーザブログ',
              components: [
                genTableComponent('ユーザブログ', 'get', '/userblog', null, ['id', 'user_id']),
              ],
            },
            {
              id: 'userblogentry',
              name: 'ユーザブログ記事',
              components: [
                genTableComponent('ユーザブログ記事', 'get', '/userblogentry', null, ['id', 'user_blog_id']),
              ],
            },
          ],
          [constant.GROUP_EXAMPLE]: [
            {
              id: 'validator',
              name: 'バリデータ',
              components: [
                genTableComponent('バリデータ', 'get', '/validator', null, ['validation_type']),
              ],
            },
            {
              id: 'nestedarray',
              name: 'ネスト配列',
              components: [
                genTableComponent('ネスト配列', 'get', '/nestedarray', null, ['id']),
              ],
            },
            {
              id: 'format',
              name: 'フォーマット',
              components: [
                genTableComponent('フォーマット', 'get', '/format', null, ['id']),
              ],

            },
          ],
          [constant.GROUP_BLOG]: [
            {
              id: 'blogdesign',
              name: 'ブログデザイン',
              components: [
                genTableComponent('ブログデザイン', 'get', '/blogdesign', null, ['id', 'name']),
              ],
            },
          ],
          // Admin
          [constant.GROUP_ADMIN]: [
            {
              id: 'adminrole',
              name: 'DMC ユーザ権限',
              components: [
                genTableComponent('DMC ユーザ権限', 'get', '/adminrole', null, ['role_id']),
              ],
            },
            {
              id: 'adminuser',
              name: 'DMC 管理ユーザ',
              components: [
                genTableComponent('DMC 管理ユーザ', 'get', '/adminuser', null, ['email', 'role_id']),
              ],
            },
            {
              id: 'auditlog',
              name: 'DMC 監査ログ',
              components: [
                genTableComponent('DMC 監査ログ', 'get', '/auditlog', null, ['createdAt', 'request_uri', 'request_method']),
              ],
            },
          ],
        },
      ])
    ),
  };

  if (!req.swagger.operation.security) {
    // /dmc自体が非認証の場合はそのまま返す
    return res.json(result);
  }

  // 権限がないcomponentを消してから返す
  const roles = req.auth.roles;
  for (let i in result.pages) {
    const page = result.pages[i];
    for (let j in page.components) {
      const component = page.components[j];
      const method = component.api.method;
      const path = component.api.path;
      if (!helperAdminRole.canAccess(path, method, roles)) {
        // 権限がないcomponentを削除
        page.components[j] = null;
      }
    }
    page.components = compact(page.components);
    if (isEmpty(page.components)) {
      // componentが空になった場合はpage自体を削除
      result.pages[i] = null;
    }
  }
  result.pages = compact(result.pages);

  res.json(result);
};

module.exports = {
  'dmc#show': show,
};