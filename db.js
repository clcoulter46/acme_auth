const Sequelize = require('sequelize');
const jwt = require('jsonwebtoken');
const { STRING } = Sequelize;
const config = {
  logging: false
};
const bcrypt = require('bcrypt')


if(process.env.LOGGING){
  delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', config);

const User = conn.define('user', {
  username: STRING,
  password: STRING
});

User.byToken = async(token)=> {
  try {
    const verifyUser = await jwt.verify(token, process.env.JWT)

    if(verifyUser){
     const user = await User.findOne({
         where: {
            id: verifyUser.userId,
         }
     });
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
  catch(ex){
    console.log(ex)
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async({ username, password })=> {
  const user = await User.findOne({
    where: {
      username
    }
  });
  const check = await bcrypt.compare(password, user.password)
  if(check){
    let token = await jwt.sign({ userId: user.id}, process.env.JWT)
    return token;
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

const syncAndSeed = async()=> {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw'},
    { username: 'moe', password: 'moe_pw'},
    { username: 'larry', password: 'larry_pw'}
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map( credential => User.create(credential))
  );
  return {
    users: {
      lucy,
      moe,
      larry
    }
  };
};

User.beforeCreate(async user => {
  const hashed = await bcrypt.hash(user.password, 10)
  user.password = hashed
})

module.exports = {
  syncAndSeed,
  models: {
    User
  }
};
