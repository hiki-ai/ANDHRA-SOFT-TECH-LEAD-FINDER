import assert from 'node:assert';
import {
  validateEmail,
  validatePassword,
  validateRegistration,
  formatUser,
  isSystemAdminEmail,
  getAuthErrorMessage,
  SYSTEM_ADMIN_EMAIL,
} from '../frontend/src/auth/authUtils.js';

console.log('=' .repeat(70));
console.log('TESTING ANDHRA SOFT TECH USER REGISTRATION & AUTH VALIDATION');
console.log('='.repeat(70));

// 1. Successful registration validation
const validData = {
  fullName: 'Rajesh Kumar',
  email: 'rajesh@andhrasofttech.com',
  password: 'Password123!',
  confirmPassword: 'Password123!',
};
const res1 = validateRegistration(validData);
assert.strictEqual(res1.isValid, true, 'Valid registration failed');
assert.deepStrictEqual(res1.errors, {}, 'Errors should be empty on valid data');
console.log('[PASS] 1. Valid registration passes all checks');

// 2. Email format validation
assert.strictEqual(validateEmail('test@company.com'), true);
assert.strictEqual(validateEmail('invalid-email'), false);
assert.strictEqual(validateEmail('test@.com'), false);
assert.strictEqual(validateEmail(''), false);

const badEmailData = { ...validData, email: 'notanemail' };
const res2 = validateRegistration(badEmailData);
assert.strictEqual(res2.isValid, false);
assert.ok(res2.errors.email.includes('valid email'));
console.log('[PASS] 2. Invalid email format correctly rejected with friendly message');

// 3. Weak password validation
const shortPwd = validatePassword('short1');
assert.strictEqual(shortPwd.isValid, false);
assert.ok(shortPwd.message.includes('8 characters'));

const onlyLetters = validatePassword('abcdefghijk');
assert.strictEqual(onlyLetters.isValid, false);
assert.ok(onlyLetters.message.includes('letters and numbers'));

const onlyNumbers = validatePassword('1234567890');
assert.strictEqual(onlyNumbers.isValid, false);
assert.ok(onlyNumbers.message.includes('letters and numbers'));

const strongPwd = validatePassword('ValidPass123');
assert.strictEqual(strongPwd.isValid, true);
console.log('[PASS] 3. Password policy (min 8 chars, letters + numbers) enforced');

// 4. Password mismatch validation
const mismatchData = { ...validData, confirmPassword: 'DifferentPassword123' };
const res4 = validateRegistration(mismatchData);
assert.strictEqual(res4.isValid, false);
assert.strictEqual(res4.errors.confirmPassword, 'Passwords do not match.');
console.log('[PASS] 4. Password mismatch correctly caught');

// 5. Missing / short Full Name
const missingNameData = { ...validData, fullName: ' ' };
const res5 = validateRegistration(missingNameData);
assert.strictEqual(res5.isValid, false);
assert.ok(res5.errors.fullName.includes('full name'));
console.log('[PASS] 5. Missing full name caught');

// 6. Role protection & system admin preservation
const regularUserObj = { uid: 'usr_new_123', email: 'regular_user@example.com' };
const formattedReg = formatUser(regularUserObj);
assert.strictEqual(formattedReg.role, 'user', 'New user must default to role: user');
assert.strictEqual(formattedReg.status, 'pending', 'New user must default to status: pending');
console.log('[PASS] 6a. Public registration defaults to restricted role: user and status: pending');

const adminUserObj = { uid: 'usr_admin_1', email: SYSTEM_ADMIN_EMAIL };
const formattedAdmin = formatUser(adminUserObj);
assert.strictEqual(formattedAdmin.role, 'admin', 'Existing admin must retain role: admin');
assert.strictEqual(formattedAdmin.status, 'active', 'Existing admin must retain status: active');
assert.strictEqual(isSystemAdminEmail(SYSTEM_ADMIN_EMAIL), true);
console.log('[PASS] 6b. Existing administrator account (admin@andhrasofttech.com) is preserved');

// 7. Firebase Auth error mapping
const emailInUseErr = getAuthErrorMessage({ code: 'auth/email-already-in-use' });
assert.ok(emailInUseErr.includes('already exists'), 'Friendly message for email-already-in-use');

const weakPwdErr = getAuthErrorMessage({ code: 'auth/weak-password' });
assert.ok(weakPwdErr.includes('weak'), 'Friendly message for weak-password');

const netErr = getAuthErrorMessage({ code: 'auth/network-request-failed' });
assert.ok(netErr.includes('Network connection'), 'Friendly message for network-request-failed');

const opNotAllowedErr = getAuthErrorMessage({ code: 'auth/operation-not-allowed' });
assert.ok(opNotAllowedErr.includes('disabled'), 'Friendly message for operation-not-allowed');
console.log('[PASS] 7. Friendly auth error messages for duplicate emails, weak passwords, and network failures');

console.log('='.repeat(70));
console.log('ALL REGISTRATION TESTS PASSED SUCCESSFULLY!');
console.log('='.repeat(70));
