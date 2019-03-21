import React, { Component } from 'react';
import { Mutation } from 'react-apollo';
import styled from 'styled-components';
import { PropTypes } from 'prop-types';
import gql from 'graphql-tag';
import { CURRENT_USER_QUERY } from './User';

const REMOVE_FROM_CART_MUTATION = gql`
  mutation REMOVE_FROM_CART_MUTATION($id: ID!) {
    removeFromCart(id: $id) {
      id
    }
  }
`;

const BigButton = styled.button`
  font-size: 3rem;
  background: none;
  border: 0;
  &:hover {
    color: ${props => props.theme.red};
    cursor: pointer;
  }
`;

class RemoveFromCart extends Component {
  static propTypes = {
    id: PropTypes.string.isRequired
  };
  //1.read the cache
  update = (cache, payload) => {
    console.log('Start removing');
    const data = cache.readQuery({ query: CURRENT_USER_QUERY });
    console.log(data);
    const cartItemId = payload.data.removeFromCart.id;
    //2.remove that item from cart
    data.me.cart = data.me.cart.filter(pizda => pizda.id !== cartItemId);
    //3. writeit back to the cache
    console.log('End removing');
    cache.writeQuery({ query: CURRENT_USER_QUERY, data });
    console.log(data);
  };

  render() {
    return (
      <Mutation
        mutation={REMOVE_FROM_CART_MUTATION}
        variables={{ id: this.props.id }}
        update={this.update}
        optimisticResponse={{
          __typename: 'Mutation',
          removeFromCart: {
            __typename: 'CartItem',
            id: this.props.id
          }
        }}
      >
        {(removeFromCart, { loading, error }) => {
          if (loading) return <p>loading!!!</p>;
          return (
            <BigButton
              title="Delete item"
              onClick={() => {
                removeFromCart().catch(err => {
                  return alert(err.message);
                });
              }}
            >
              &times;
            </BigButton>
          );
        }}
      </Mutation>
    );
  }
}

export default RemoveFromCart;
