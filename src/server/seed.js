/**
 * 种子数据导入（安全模式）
 *
 * 用法: node src/server/seed.js
 *       node src/server/seed.js --force  强制重新导入所有数据
 *
 * 安全特性:
 *   - 菜谱: 仅在数据库为空时导入，已有数据则跳过
 *   - 用户: 永远不清除已有用户，仅在 admin 不存在时创建
 *   - --force: 强制覆盖菜谱数据（用户数据依然保留）
 */

const db = require('./db');
const RecipeModel = require('./models/Recipe');
const UserModel = require('./models/User');
const crypto = require('crypto');
const seedData = require('./seed-data.json');

const FORCE = process.argv.includes('--force');

async function seed() {
  console.log('🌱 种子数据检查...\n');

  // ── 导入菜谱 ──
  const existingRecipes = await RecipeModel.Recipe.find({});
  if (existingRecipes.length === 0 || FORCE) {
    if (FORCE && existingRecipes.length > 0) {
      console.log('📖 强制重新导入菜谱...');
      await RecipeModel.Recipe.clear();
    } else {
      console.log('📖 导入菜谱...');
    }
    const inserted = await RecipeModel.Recipe.insertMany(seedData);
    console.log(`   ✅ ${inserted.length} 道菜谱`);

    const categories = {};
    inserted.forEach(r => (r.tags || []).forEach(t => { categories[t] = (categories[t] || 0) + 1; }));
    console.log('\n📊 标签分布:');
    Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
      console.log(`   ${tag}: ${count} 道`);
    });
  } else {
    console.log(`📖 菜谱已存在 (${existingRecipes.length} 道)，跳过导入`);
    console.log('   如需强制重新导入请使用: node src/server/seed.js --force');
  }

  // ── 创建管理员（仅首次） ──
  const existingAdmin = await UserModel.findOne({ username: 'admin' });
  if (!existingAdmin) {
    console.log('\n👤 创建管理员账号...');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync('admin123', salt, 100000, 64, 'sha512').toString('hex');
    await UserModel.User.insert({
      username: 'admin',
      password: `${salt}:${hash}`,
      avatar: '😊',
      bio: '系统管理员',
      location: '',
      level: '厨神',
      role: 'admin',
      banned: false,
      preferences: [],
      favorites: [],
      shares: [],
      pendingEdits: [],
      createdAt: new Date()
    });
    console.log('   ✅ admin / admin123');
  } else {
    console.log('\n👤 管理员已存在，跳过');
  }

  // ── 统计 ──
  console.log('\n📈 数据统计:');
  const stats = db.stats();
  Object.entries(stats).forEach(([name, count]) => {
    console.log(`   📂 ${name}: ${count} 条`);
  });

  console.log(`\n🎉 完成！`);
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ 失败:', err.message);
  process.exit(1);
});
