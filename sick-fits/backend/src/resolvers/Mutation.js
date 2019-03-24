const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const { transport, makeANiceEmail } = require('../mail');
const { hasPermission } = require('../utils');
const stripe = require('../stripe');
const Mutations = {
  async createItem(parent, args, ctx, info) {
    console.log(args);
    if (await !ctx.request.userId) {
      throw new Error('you must be loggin');
    }
    //todo check
    const item = await ctx.db.mutation.createItem(
      {
        data: {
          user: {
            connect: {
              id: ctx.request.userId
            }
          },
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
    const item = await ctx.db.query.item({ where }, `{title id user{id}}`);
    const ownItem = item.user.id === ctx.request.userId;
    const hasPermission = ctx.request.user.permissions.some(perm =>
      ['ADMIN', 'ITEMDELETE'].includes(perm)
    );
    if (!ownItem && hasPermission) {
      throw newError('You haven`t permissions and not owner ');
    }
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
    // console.log(res);

    const mailRes = await transport.sendMail({
      from: 'kayot88@gmail.com',
      to: user.email,
      subject: 'Your Password Reset Token',
      html: makeANiceEmail(`Your Password Reset Token is here!
      \n\n
      <a href="${
        process.env.FRONTEND_URL
      }/reset?resetToken=${resetToken}">Click Here to Reset</a>`)
    });

    return { message: 'Thanx!' };
  },

  async resetPassword(parent, args, ctx, info) {
    //1.check if the password match
    if (args.password !== args.confirmPassword) {
      throw new Error(`The password '${args.confirmPassword}' is invalid`);
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
  },

  async updatePermissions(parent, args, ctx, info) {
    //checklogin
    if (!ctx.request.userId) {
      throw new Error('You have not permiss');
    }
    //qierycurrent user
    const currentUser = await ctx.db.query.user(
      { where: { id: ctx.request.userId } },
      info
    );
    if (!currentUser) {
      throw new Error('there aren`t user like you');
    }
    //check if they have permiss to do this
    // console.log(currentUser);
    hasPermission(currentUser, ['ADMIN', 'PERMISSIONUPDATE']);
    return ctx.db.mutation.updateUser(
      {
        data: {
          permissions: {
            set: args.permissions
          }
        },
        where: {
          id: args.userId
        }
      },
      info
    );
  },
  async addToCart(parent, args, ctx, info) {
    //1 sing in?
    const { userId } = ctx.request;
    if (!userId) {
      throw new Error('You must be sign in');
    }
    //2 Query the  users current cart
    const [existingCartItem] = await ctx.db.query.cartItems({
      where: {
        user: { id: userId },
        item: { id: args.id }
      }
    });
    //3 Check if this cart allready in the cart increment by 1 if it is
    if (existingCartItem) {
      console.log('This is already in their cart');
      return ctx.db.mutation.updateCartItem(
        {
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + 1 }
        },
        info
      );
    }
    //4 if its not, create a fresh cartItem
    return ctx.db.mutation.createCartItem(
      {
        data: {
          user: {
            connect: { id: userId }
          },
          item: {
            connect: {
              id: args.id
            }
          }
        }
      },
      info
    );
  },
  async removeFromCart(parent, args, ctx, info) {
    //1.find te cart item
    const cartItem = await ctx.db.query.cartItem(
      {
        where: {
          id: args.id
        }
      },
      `{id, user{id}}`
    );
    if (!cartItem) {
      throw new Error('No much cartItem');
    }
    //2.check for ownes
    const { userId } = ctx.request;
    if (cartItem.user.id !== userId) {
      // console.assert(cartItem.user.id == userId, 'fuck no');
      throw new Error('You are not the own');
    }
    //3.delete item
    return ctx.db.mutation.deleteCartItem(
      {
        where: { id: args.id }
      },
      info
    );
  },
  async createOrder(parent, args, ctx, info) {
    //query current user
    const { userId } = ctx.request;
    if (!userId) {
      throw new Error('you must be sign in');
    }
    const user = await ctx.db.query.user(
      {
        where: {
          id: userId
        }
      },
      `{
        id
         name 
         email
        cart{
          id
          quantity
          item {
            title
            price
            id
            description
            image}
        }}`
    );
    //recalc the total price
    const amount = user.cart.reduce((tally, cartItem) => {
      return tally + cartItem.item.price * cartItem.quantity;
    }, 0);
    console.log(`charge ${amount}`);
    //create stripe charge (turn token into $$$)
    const charge = await stripe.charges.create({
      amount,
      currency: 'USD',
      source: args.token
    });
    //convert the CartItems to OrderItems
    //create Order
    //clean up - clear the user cart, delete cartItems
    //return theorder to the client
  }
};

module.exports = Mutations;
