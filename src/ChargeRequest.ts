class ChargeRequest {
	private payment_type: string = "";
	private vouchers_array?: string[] = [];
	private coupons_array?: string[] = [];
	private force_update_3d?: boolean;
	private customer?: {
		customer_name?: string;
		vat_number?: string;
		phone?: string;
		email?: string;
		contact_address?: string;
		contact_country?: string;
		notes?: string;
	};
	private payment: {
		custom_invoice_name?: string;
		card_holder_name?: string;
		card_holder_id?: string;
		card_holder_phone?: string;
		payments?: number;
		approved_terms?: boolean;
		recaptcha_hash?: string;
		selected_products?: string;
	} = {};
	private extra_fields?: {
        [key: string]: string
    } = {} as any;

    constructor() {
        this.Reset();
    }

    public GetData = () => {
        let data: any = {};
        for (let key in this) {
            if (typeof this[key as keyof ChargeRequest] !== "function") {
                data[key] = this[key as keyof ChargeRequest];
            }
        }
        return data;
    }

    public SetParam = (value: any, key: string, inParam?:string) => {
        if (inParam) {
            let tmp:any = this[inParam as keyof ChargeRequest];
            if (tmp) {
                tmp[key] = value;
            }
            return;
        }
        this[key as keyof ChargeRequest] = value;
    }

    public Reset() {
        this.payment_type = "credit-card";
        this.vouchers_array = []; 
        this.coupons_array = [];
        this.force_update_3d = false;
        this.customer = {
            customer_name: "",
            vat_number: "",
            phone: "",
            email: "",
            contact_address: "",
            contact_country: "",
            notes: ""
        };
        this.payment = {
            custom_invoice_name: "",
            card_holder_name: "",
            card_holder_id: "",
            card_holder_phone: "",
            payments: 0,
            approved_terms: false,
            recaptcha_hash: "",
            selected_products: ""
        };
        this.extra_fields = {};
    } 
}

export default new ChargeRequest;