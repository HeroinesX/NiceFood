const db = require('../db');

const Recipe = db.collection('recipes');

// 兼容 Mongoose 的 findById
const findById = async (id) => Recipe.findById(id);

const find = async (query = {}, options = {}) => {
  const { search, tag, page, limit } = query;

  const dbQuery = {};
  const dbOptions = {};

  // 过滤已驳回
  dbQuery.status = { $ne: 'rejected' };

  if (search) {
    dbQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'ingredients.name': { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }
  if (tag) {
    dbQuery.tags = tag;
  }

  // 额外传递给 find 方法的 query 参数
  // page/limit 是元数据，不传给底层
  const skipVal = page ? (parseInt(page) - 1) * parseInt(limit || '20') : 0;
  const limitVal = limit ? parseInt(limit) : 0;
  if (skipVal > 0) dbOptions.skip = skipVal;
  if (limitVal > 0) dbOptions.limit = limitVal;

  const recipes = await Recipe.find(dbQuery, dbOptions);
  const total = await Recipe.count(dbQuery);

  return { recipes, total };
};

const findByIdAndUpdate = async (id, update) => {
  await Recipe.update({ _id: id }, update);
  return Recipe.findById(id);
};

const findByIdAndDelete = async (id) => {
  const doc = await Recipe.findById(id);
  await Recipe.remove({ _id: id });
  return doc;
};

module.exports = {
  Recipe,
  findById,
  find,
  findByIdAndUpdate,
  findByIdAndDelete,
  insertMany: (...args) => Recipe.insertMany(...args),
  deleteMany: (...args) => Recipe.remove(...args),
  count: (...args) => Recipe.count(...args),
  findOne: (...args) => Recipe.findOne(...args),
  seed: (data) => db.seed('recipes', data)
};
