/**
 * 🔥 零依赖 JSON 文件数据库
 *
 * 纯 JavaScript，不需要 MongoDB、不需要 native 模块。
 * 数据持久化到 .data/ 目录下的 JSON 文件。
 *
 * 用法：
 *   const db = require('./db');
 *   const Recipe = db.collection('recipes');
 *   await Recipe.find({ tags: '家常' });
 *   await Recipe.insert({ name: '番茄炒蛋', ... });
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── 工具函数 ──
const generateId = () => crypto.randomBytes(12).toString('hex');

const DATA_DIR = path.join(__dirname, '..', '..', '.data');

// ── 集合类 ──
class Collection {
  constructor(name) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this.data = [];
    this.loaded = false;
  }

  // ── 文件 I/O ──
  _ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  _load() {
    this._ensureDataDir();
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.data = [];
        this._save();
      }
    } catch (err) {
      console.warn(`⚠️  无法加载 ${this.name} 数据，重新创建`);
      this.data = [];
      this._save();
    }
    this.loaded = true;
  }

  _save() {
    this._ensureDataDir();
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  _ensureLoaded() {
    if (!this.loaded) this._load();
  }

  // ── 查询匹配引擎 ──
  _matches(doc, query) {
    if (!query || Object.keys(query).length === 0) return true;
    for (const [key, value] of Object.entries(query)) {
      // 特殊操作符
      if (key === '$or') {
        if (!Array.isArray(value)) continue;
        const orMatch = value.some(condition => this._matches(doc, condition));
        if (!orMatch) return false;
        continue;
      }
      if (key === '$and') {
        if (!Array.isArray(value)) continue;
        const andMatch = value.every(condition => this._matches(doc, condition));
        if (!andMatch) return false;
        continue;
      }

      // 嵌套字段查找 (如 'ingredients.name')
      const docValue = this._getNested(doc, key);

      // 操作符对象
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const opKeys = Object.keys(value);
        if (opKeys.some(k => k.startsWith('$'))) {
          for (const [op, opVal] of Object.entries(value)) {
            if (!this._matchOperator(docValue, op, opVal)) return false;
          }
          continue;
        }
      }

      // 精确匹配（忽略 _id 的类型差异）
      if (key === '_id' || key.endsWith('._id') || key.endsWith('Id') && key !== 'Id') {
        if (!this._idMatch(docValue, value)) return false;
        continue;
      }

      // 数组包含匹配
      if (Array.isArray(docValue) && typeof value === 'string') {
        if (!docValue.some(item => this._valueMatch(item, value))) return false;
        continue;
      }

      // 普通值匹配
      if (!this._valueMatch(docValue, value)) return false;
    }
    return true;
  }

  _getNested(obj, pathStr) {
    const parts = pathStr.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  _valueMatch(a, b) {
    if (a === b) return true;
    if (a === undefined || a === null) return false;
    // 正则匹配
    if (b && b.constructor && b.constructor.name === 'RegExp') return b.test(String(a));
    if (b && typeof b === 'object' && b.$regex) {
      const flags = b.$options || '';
      return new RegExp(b.$regex, flags).test(String(a));
    }
    // 大小写不敏感包含
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase().includes(b.toLowerCase()) ||
             b.toLowerCase().includes(a.toLowerCase());
    }
    return String(a) === String(b);
  }

  _idMatch(a, b) {
    if (!a || !b) return false;
    return String(a) === String(b);
  }

  _matchOperator(value, op, opVal) {
    switch (op) {
      case '$in':
        return Array.isArray(opVal) && opVal.some(v => this._valueMatch(value, v));
      case '$ne':
        return value !== opVal;
      case '$gt':
        return Number(value) > Number(opVal);
      case '$gte':
        return Number(value) >= Number(opVal);
      case '$lt':
        return Number(value) < Number(opVal);
      case '$lte':
        return Number(value) <= Number(opVal);
      case '$exists':
        return opVal ? value !== undefined : value === undefined;
      case '$regex':
        return new RegExp(opVal, 'i').test(String(value));
      case '$nin':
        return !(Array.isArray(opVal) && opVal.some(v => this._valueMatch(value, v)));
      default:
        return true;
    }
  }

  // ── CRUD API ──

  async find(query = {}, options = {}) {
    this._ensureLoaded();
    let results = this.data.filter(doc => this._matches(doc, query));

    // 排序
    if (options.sort) {
      const [sortKey, sortDir] = Array.isArray(options.sort)
        ? [Object.keys(options.sort)[0], Object.values(options.sort)[0]]
        : [Object.keys(options.sort)[0], Object.values(options.sort)[0]];
      results.sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey];
        if (va < vb) return -1 * sortDir;
        if (va > vb) return 1 * sortDir;
        return 0;
      });
    }

    // 跳过 & 限制
    const skip = options.skip || 0;
    const limit = options.limit || 0;
    if (skip > 0) results = results.slice(skip);
    if (limit > 0) results = results.slice(0, limit);

    return results;
  }

  async findOne(query = {}) {
    this._ensureLoaded();
    return this.data.find(doc => this._matches(doc, query)) || null;
  }

  async findById(id) {
    return this.findOne({ _id: id });
  }

  async insert(doc) {
    this._ensureLoaded();
    const newDoc = { ...doc, _id: doc._id || generateId() };
    this.data.push(newDoc);
    this._save();
    return newDoc;
  }

  async insertMany(docs) {
    this._ensureLoaded();
    const inserted = docs.map(doc => ({ ...doc, _id: doc._id || generateId() }));
    this.data.push(...inserted);
    this._save();
    return inserted;
  }

  async update(query, update, options = {}) {
    this._ensureLoaded();
    const matches = this.data.filter(doc => this._matches(doc, query));
    let modifiedCount = 0;

    for (const doc of matches) {
      if (update.$set) {
        Object.assign(doc, update.$set);
        modifiedCount++;
      } else if (update.$push) {
        for (const [key, value] of Object.entries(update.$push)) {
          if (!Array.isArray(doc[key])) doc[key] = [];
          doc[key].push(value);
        }
        modifiedCount++;
      } else if (update.$pull) {
        for (const [key, value] of Object.entries(update.$pull)) {
          if (Array.isArray(doc[key])) {
            doc[key] = doc[key].filter(item => !this._matches(item, value));
          }
        }
        modifiedCount++;
      } else if (update.$addToSet) {
        for (const [key, value] of Object.entries(update.$addToSet)) {
          if (!Array.isArray(doc[key])) doc[key] = [];
          if (!doc[key].some(item => this._valueMatch(item, value))) {
            doc[key].push(value);
            modifiedCount++;
          }
        }
      } else {
        // 直接替换
        Object.assign(doc, update);
        modifiedCount++;
      }
    }

    if (modifiedCount > 0) this._save();
    return { modifiedCount };
  }

  async updateOne(query, update) {
    return this.update(query, update, { multi: false });
  }

  async remove(query = {}) {
    this._ensureLoaded();
    const before = this.data.length;
    this.data = this.data.filter(doc => !this._matches(doc, query));
    const removed = before - this.data.length;
    if (removed > 0) this._save();
    return removed;
  }

  async count(query = {}) {
    this._ensureLoaded();
    return this.data.filter(doc => this._matches(doc, query)).length;
  }

  // 选择字段
  select(fields) {
    return this;
  }

  // 关联加载 (populate的简化版本)
  async populate(docs, field) {
    if (!docs || docs.length === 0) return docs;
    const refCollection = this;
    const refIds = docs.map(d => d[field]).filter(Boolean);
    const refs = await refCollection.find({ _id: { $in: refIds.map(String) } });
    return docs.map(doc => ({
      ...doc,
      [field]: refs.filter(r => String(r._id) === String(doc[field]))
    }));
  }

  // 强制保存（用于外部修改 data 数组后持久化）
  _saveForce() {
    this._ensureDataDir();
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  // 清空
  async clear() {
    this.data = [];
    this._save();
  }
}

// ── 数据库工厂 ──
const collections = {};

const db = {
  collection: (name) => {
    if (!collections[name]) {
      collections[name] = new Collection(name);
    }
    return collections[name];
  },

  // 批量导入种子数据
  async seed(name, data) {
    const col = db.collection(name);
    await col.clear();
    return col.insertMany(data);
  },

  // 获取所有数据统计
  stats() {
    const result = {};
    for (const [name, col] of Object.entries(collections)) {
      col._ensureLoaded();
      result[name] = col.data.length;
    }
    return result;
  }
};

module.exports = db;
