import BaseDataInput from "./BaseDataInput";
import Dom from "./Dom";
import PayPlusHostedFields from "./PayPlusHostedFields";

export default class PayPlusHostedFieldsDom extends PayPlusHostedFields {
    DataInput: BaseDataInput
    constructor() {
        super();
        this.DataInput = new Dom();
        this.init();
    }
}