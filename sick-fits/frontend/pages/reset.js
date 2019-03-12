import ResetPassword from '../components/ResetPassword';
const Reset = props => (
  <div>
    <p>user`s id resetToken {props.query.resetToken}</p>
    <ResetPassword resetToken={props.query.resetToken} />
  </div>
);

export default Reset;
