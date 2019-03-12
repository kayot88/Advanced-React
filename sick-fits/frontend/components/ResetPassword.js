import React, { Component } from 'react';
import { Mutation } from 'react-apollo';
import gql from 'graphql-tag';
import Form from './styles/Form';
import Error from './ErrorMessage.js';
import { CURRENT_USER_QUERY } from './User';

const RESET_PASSWORD_MUTATION = gql`
  mutation RESET_PASSWORD_MUTATION(
    $resetToken: String!
    $password: String!
    $confirmPassword: String!
  ) {
    resetPassword(
      resetToken: $resetToken
      password: $password
      confirmPassword: $confirmPassword
    ) {
     id
     name
     email
    }
  }
`;

class ResetPassword extends Component {
  state = {
    password: '',
    confirmPassword: ''
  };
  saveToState = e => {
    this.setState({
      [e.target.name]: e.target.value
    });
  };
  render() {
    return (
      <Mutation
        mutation={RESET_PASSWORD_MUTATION}
        variables={{
          resetToken: this.props.resetToken,
          password: this.state.password,
          confirmPassword: this.state.confirmPassword
        }}
        refetchQueries={[{ query: CURRENT_USER_QUERY }]}
      >
        {(resetPassword, { loading, error }) => (
          <Form
            method="post"
            onSubmit={async e => {
              e.preventDefault();
              await resetPassword();
              this.setState({
                password: '',
                confirmPassword: ''
              });
            }}
          >
            <fieldset disabled={loading} aria-busy={loading}>
              <h2>Reset Password</h2>
              <Error error={error} />
              <label htmlFor="password">
                Password
                <input
                  type="password"
                  name="password"
                  placeholder="password"
                  value={this.state.email}
                  onChange={this.saveToState}
                />
              </label>
              <label htmlFor="confirmPassword">
                Confirm your password
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="confirmPassword"
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

export default ResetPassword;
