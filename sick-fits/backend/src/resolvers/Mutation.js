const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const Mutations = {
  async createItem(parent, args, ctx, info) {
    //todo check
    const item = await ctx.db.mutation.createItem(
      {
        data: {
          ...args
        }
      },
      info
    );
    return item;
  },
  updateItem(parent, args, ctx, info) {
    const updates = { ...args };
    delete updates.id;
    return ctx.db.mutation.updateItem(
      {
        data: updates,
        where: { id: args.id }
      },
      info
    );
  },

  async deleteItem(parent, args, ctx, info) {
    const where = { id: args.id };
    const item = await ctx.db.query.item({ where }, `{title id}`);
    return ctx.db.mutation.deleteItem({ where }, info);
  },

  async signup(parent, args, ctx, info) {
    // lowercase their email
    args.email = args.email.toLowerCase();
    // hash their password
    const password = await bcrypt.hash(args.password, 10);
    // create the user in the database
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args,
          password,
          permissions: { set: ['USER'] }
        }
      },
      info
    );
    // create the JWT token for them
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // We set the jwt as a cookie on the response
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year cookie
    });
    // Finalllllly we return the user to the browser
    return user;
  },

  async signin(parent, { email, password }, ctx, info) {
    //check for email in db user return
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error(`No such user with ${email} email`);
    }
    //valid password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error(`This password is invalid`);
    }
    //generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    //push token to cookie
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    return user;
  },
  signout(parent, args, ctx, info) {
    ctx.response.clearCookie('token');
    return { message: 'Goodbye!' };
  },
  async requestReset(parent, args, ctx, info) {
    //1.check email => user
    const user = await ctx.db.query.user({ where: { email: args.email } });
    if (!user) {
      throw new Error(`No user with ${args.email} email`);
    }
    //2.set create resetToken & expiry
    const resetToken = (await promisify(randomBytes)(20)).toString('hex');
    const resetTokenExpiry = Date.now() + 36000000;
    //3.send resetTokento user
    const res = await ctx.db.mutation.updateUser({
      where: { email: args.email },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });
    console.log(res);
    return { message: 'Thanx!' };
  },
  async resetPassword(parent, args, ctx, info) {
    //1.check if the password match
    if (args.password !== args.confirmPassword) {
      throw new Error(
        `The password '${args.confirmPassword}' is invalid`
      );
    }
    //2.check resetToken
    //3.check resetTokenExpiry
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 36000000
      }
    });
    if (!user) {
      throw new Error(
        `The resetToken '${args.resetToken}' is invalid or expired`
      );
    }
    //4.hash the new password
    const password = await bcrypt.hash(args.password, 10);
    //5.save new passw to db
    const updatedUser = await ctx.db.mutation.updateUser({
      where: {
        resetToken: user.resetToken
      },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
    //6.JWT
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
    //7.set jwt to cookie
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    return updatedUser;
  }
};

module.exports = Mutations;
