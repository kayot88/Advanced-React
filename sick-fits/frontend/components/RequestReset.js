import React, { Component } from 'react';
import { Mutation } from 'react-apollo';
import gql from 'graphql-tag';
import Form from './styles/Form';
import Error from './ErrorMessage.js';
// import { CURRENT_USER_QUERY } from './User';

const REQUEST_RESET_MUTATION = gql`
  mutation REQUEST_RESET_MUTATION($email: String!) {
    requestReset(email: $email) {
      message
    }
  }
`;

class RequestReset extends Component {
  state = {
    email: ''
  };
  saveToState = e => {
    this.setState({
      [e.target.name]: e.target.value
    });
  };
  render() {
    return (
      <Mutation
        mutation={REQUEST_RESET_MUTATION}
        variables={this.state}
        // refetchQueries={[{ query: CURRENT_USER_QUERY }]}
      >
        {(requestReset, { loading, error }) => (
          <Form
            method="post"
            onSubmit={async e => {
              e.preventDefault();
              await requestReset();
              this.setState({
                email: ''
              });
            }}
          >
            <fieldset disabled={loading} aria-busy={loading}>
              <h2>Request Reset</h2>
              <Error error={error} />
              <label htmlFor="email">
                email
                <input
                  type="email"
                  name="email"
                  placeholder="email"
                  value={this.state.email}
                  onChange={this.saveToState}
                />
              </label>

              <button type="submit">Reset password</button>
            </fieldset>
          </Form>
        )}
      </Mutation>
    );
  }
}

export default RequestReset;
