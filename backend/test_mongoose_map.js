const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  reactions: {
    type: Map,
    of: [String],
    default: {}
  }
});

const Model = mongoose.model('Test', schema);

async function run() {
  const doc = new Model();
  doc.reactions.set('👍', ['user1']);
  console.log('fromEntries:', Object.fromEntries(doc.reactions));
}

run();
