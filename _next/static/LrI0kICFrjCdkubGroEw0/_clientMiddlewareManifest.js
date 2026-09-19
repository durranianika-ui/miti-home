self.__MIDDLEWARE_MATCHERS = [
  {
    "regexp": "^\\/miti-home(?:\\/(_next\\/data\\/[^/]{1,}))?\\/product(?:\\/([^\\/#\\?]+?))(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$",
    "originalSource": "/product/:slug"
  }
];self.__MIDDLEWARE_MATCHERS_CB && self.__MIDDLEWARE_MATCHERS_CB()