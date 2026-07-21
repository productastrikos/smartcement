const bcrypt = require('bcryptjs');

const DEMO_PASSWORD = 'Astrikos2026';
const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

const USERS = [
  {
    id: 'usr-admin',
    username: 'admin',
    email: 'admin@cempulse.demo',
    fullName: 'Rajesh Kumar',
    role: 'plant_admin',
    roleLabel: 'Plant Administrator',
    passwordHash,
  },
  {
    id: 'usr-operator',
    username: 'operator',
    email: 'operator@cempulse.demo',
    fullName: 'Priya Nair',
    role: 'control_room_operator',
    roleLabel: 'Control Room Operator',
    passwordHash,
  },
  {
    id: 'usr-maintenance',
    username: 'maintenance',
    email: 'maintenance@cempulse.demo',
    fullName: 'Suresh Menon',
    role: 'maintenance_engineer',
    roleLabel: 'Maintenance Engineer',
    passwordHash,
  },
  {
    id: 'usr-hse',
    username: 'hse',
    email: 'hse@cempulse.demo',
    fullName: 'Anita Fernandes',
    role: 'hse_officer',
    roleLabel: 'HSE / Safety Officer',
    passwordHash,
  },
];

function findUserByIdentifier(identifier) {
  if (!identifier) return undefined;
  const needle = String(identifier).toLowerCase();
  return USERS.find(
    (u) => u.username.toLowerCase() === needle || u.email.toLowerCase() === needle
  );
}

function findUserById(id) {
  return USERS.find((u) => u.id === id);
}

function verifyPassword(user, password) {
  if (!user) return false;
  return bcrypt.compareSync(password || '', user.passwordHash);
}

function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash: _omit, ...publicUser } = user;
  return publicUser;
}

module.exports = {
  USERS,
  DEMO_PASSWORD,
  findUserByIdentifier,
  findUserById,
  verifyPassword,
  toPublicUser,
};
