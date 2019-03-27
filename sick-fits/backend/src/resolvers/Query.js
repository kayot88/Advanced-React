const { forwardTo } = require('prisma-binding');
const { hasPermission } = require('../utils');

const Query = {
  items: forwardTo('db'),
  item: forwardTo('db'),
  itemsConnection: forwardTo('db'),
  me(parent, args, ctx, info) {
    // check if there is a current user ID
    if (!ctx.request.userId) {
      return null;
    }
    return ctx.db.query.user(
      {
        where: { id: ctx.request.userId }
      },
      info
    );
  },
  async users(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error('You must be logged in!');
    }
    console.log(ctx.request.userId);
    // 2. Check if the user has the permissions to query all the users
    hasPermission(ctx.request.user, ['ADMIN', 'PERMISSIONUPDATE']);

    // 2. if they do, query all the users!
    return ctx.db.query.users({}, info);

    // return  ctx.db.query.users({}, info);
  },
  async order(parent, args, ctx, info) {
    //loggedin
    if (!ctx.request.userId) {
      throw new Error('You must be logged In');
    }
    //current order
    const order = await ctx.db.query.order(
      {
        where: { id: args.id }
      },
      info
    );
    //check if the have the permissionssee this order
    const ownsOrder = order.user.id === ctx.request.userId;
    const hasPermissionsToSee = ctx.request.user.permissions.includes('ADMIN');
    if (!ownsOrder && !hasPermissionsToSee) {
      throw new Error('You cant see this order');
    }
    return order;
  },
  async orders(parent, args, ctx, info) {
    const { userId } = ctx.request;
    if (!userId) {
      throw new Error('You must be logged In');
    }
    return orders = await ctx.db.query.orders({
      where: {
        user: { id: userId }
      }
    }, info);
  }
};

module.exports = Query;
