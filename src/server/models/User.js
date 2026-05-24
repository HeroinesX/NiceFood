const db = require('../db');

const Users = db.collection('users');

const findById = async (id) => Users.findById(id);

const findOne = async (query) => Users.findOne(query);

const findByIdAndUpdate = async (id, update) => {
  // 处理直接对象更新 vs $set/$push
  const updateObj = { $set: update };
  if (update) {
    const hasOperators = Object.keys(update).some(k => k.startsWith('$'));
    const result = await Users.update({ _id: id }, hasOperators ? update : updateObj);
    return result;
  }
  return Users.findById(id);
};

const updateOne = async (filter, update) => {
  return Users.update(filter, update);
};

// 填充收藏菜谱
const populateFavorites = async (user) => {
  if (!user || !user.favorites || user.favorites.length === 0) {
    return user;
  }
  const Recipe = db.collection('recipes');
  const favIds = user.favorites.map(id => String(id));
  const recipes = await Recipe.find({});
  return {
    ...user,
    favorites: recipes.filter(r => favIds.includes(String(r._id)))
  };
};

module.exports = {
  User: Users,
  findById,
  findOne,
  findByIdAndUpdate,
  updateOne,
  populateFavorites,
  seed: (data) => db.seed('users', data)
};
