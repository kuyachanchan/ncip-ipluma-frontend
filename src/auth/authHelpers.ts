type Helpers = {
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
};

let helpers: Helpers = {
  refresh: async () => false,
  logout: async () => {}
};

export const setAuthHelpers = (h: Helpers) => {
  helpers = h;
};

export const getAuthHelpers = () => helpers;