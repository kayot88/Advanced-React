import PleaseSignin from '../components/PleaseSignin';
import Order from '../components/Order';


const OrderPage = props => (
  <PleaseSignin>
    <Order id={props.query.id}/>
  </PleaseSignin>
);

export default OrderPage;
