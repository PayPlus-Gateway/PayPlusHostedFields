import BaseDataInput from "./BaseDataInput";
import ChargeRequest from "./ChargeRequest";
import {
	Config,
	EventNames,
	HTMLClasses,
	HostedFieldData,
	HostedFieldsKeys,
	HostedFieldsKeysList,
	InitHostedFieldsData,
	nonHostedFieldsMapping,
} from "./types";
import { deferred } from "./utils";
export default abstract class PayPlusHostedFields {
	abstract DataInput: BaseDataInput;
	InitPaymentPage: any;
	ChargeRequest:typeof ChargeRequest = ChargeRequest;
	private config: Config;
	private numberOfAttempts: number = 0;
	private __page_request_uid: string = "";
	private __hosted_fields_uuid: string = "";
	private __paymentPageData: any;
	private __origin: string = "";
	private __paymentPageDfrd: any = null;
	private __AwaitingFields: { 
		cc: boolean,
		expiry?: boolean, 
		expiryy?: boolean
		expirym?: boolean,
		recaptcha?: boolean
	 } = {
		cc: false,
		expiry: false,
		expiryy: false,
		expirym: false,
	};
	private __hostedFields: {
		cc: HostedFieldData;
		cvv: HostedFieldData;
		expiry: HostedFieldData;
		expiryy: HostedFieldData;
		expirym: HostedFieldData;
	} = {} as any;
	private __expirySeparateFields: boolean = false;
	
	private __recaptchaReplacementElm: HTMLElement | null = null;
	private __recaptchaIframeElm: HTMLIFrameElement | null = null;
	private __applepayReplacementElm: HTMLElement | null = null;
	private __applepayIframeElm: HTMLIFrameElement | null = null;
	private __showApplePayButton: boolean = false;
	private __googlepayReplacementElm: HTMLElement | null = null;
	private __googlepayIframeElm: HTMLIFrameElement | null = null;
	private __showGooglePayButton: boolean = false;
	private __showRecaptcha: boolean = false;
	private __recaptchaToken: string = "";
	private __securee3dsIframeElm: HTMLIFrameElement | null = null;
	private __hostedFieldsStyles: string = "";
	constructor() {
		this.config = {
			Secure3Ds: {
				ResetStyle: false
			}
		}
	}

	protected init() {
		this.ResetInputs();
		this.InitPaymentPage = deferred();
		this.listenForMessages();
	}

	SetConfig(key:string, value:any) {
		const path = key.split(".");
		let obj:any = this.config;
		for (let i = 0; i < path.length - 1; i++) {
			if (obj.hasOwnProperty(path[i])) {
				obj = obj[path[i]];
			} else {
				throw new Error("invalid-config-key");
			}
		}
		if (!obj.hasOwnProperty(path[path.length - 1])) {
			throw new Error("invalid-config-key");
		}
		obj[path[path.length - 1]] = value;
	}

	SetMainFields(fldsData: InitHostedFieldsData) {
		for (const key of HostedFieldsKeysList) {
			if (
				!fldsData[key as HostedFieldsKeys]
				|| !fldsData[key as HostedFieldsKeys].elmSelector
				|| !fldsData[key as HostedFieldsKeys].wrapperElmSelector
			) {
				throw new Error("Missing required field data");
			}
			if (
				!document.querySelector(fldsData[key as HostedFieldsKeys].elmSelector)
				|| !document.querySelector(fldsData[key as HostedFieldsKeys].wrapperElmSelector)
				) {
				throw new Error("Missing required field data");
			}
			this.__hostedFields[key as HostedFieldsKeys] = {	
				selector: fldsData[key as HostedFieldsKeys].elmSelector,
				wrapperSelector: fldsData[key as HostedFieldsKeys].wrapperElmSelector,
				config: fldsData[key as HostedFieldsKeys].config
			};
		}
		
		return this;
	}

	SetRecaptcha(elmSelector: string) {
		this.validateOrThrow();
		if (!document.querySelector(elmSelector)) {
			throw new Error("Missing required field data");
		}
		this.__recaptchaReplacementElm = document.querySelector(elmSelector);
		return this;
	}

	SetApplePay(elmSelector: string) {
		this.validateOrThrow();
		if (!document.querySelector(elmSelector)) {
			throw new Error("Missing required field data");
		}
		this.__applepayReplacementElm = document.querySelector(elmSelector);
		return this;
	}

	SetGooglePay(elmSelector: string) {
		this.validateOrThrow();
		if (!document.querySelector(elmSelector)) {
			throw new Error("Missing required field data");
		}
		this.__googlepayReplacementElm = document.querySelector(elmSelector);
		return this;
	}

	AddField(fld: string, elmSelector: string, wrapperElmSelector?: string) {
		this.validateOrThrow();
		if (HostedFieldsKeysList.includes(fld)) {
			throw new Error("Hosted fields are already set.");
		}
		this.DataInput.AddField(fld, elmSelector, wrapperElmSelector);
		return this;
	}

	SetHostedFieldsStyles(styles: string) {
        this.__hostedFieldsStyles = styles;
    }

	async CreatePaymentPage(data: {
		origin: string;
		page_request_uid: string;
		hosted_fields_uuid: string;
	}): Promise<void> {
		this.validateOrThrow();
		this.__origin = data.origin;
		this.__page_request_uid = data.page_request_uid;
		this.__hosted_fields_uuid = data.hosted_fields_uuid;
		this.initHostedFieldIframe("cvv");
		this.InitPaymentPage.then((data: any) => {
			this.__expirySeparateFields = !data.data.payment_page.field_content_settings.merge_expiry_date_field
			if (!data.fields.show_cvv) {
				this.hideCVVIframe()
			}
			this.initPaymentPage(data);
		});
	}

	SubmitPayment() {
		this.__paymentPageDfrd = deferred();
		this.fireCustomEvent(EventNames.SUBMIT_PROCESS, true);
		this.toggleDisableForm(false);
		this.ResetInputs();
		this.__hostedFields.cc.elm!.contentWindow!.postMessage(
			{ type: "save-fld-data-to-srv" },
			this.__origin
		);
		if (this.__expirySeparateFields) {
			this.__hostedFields.expirym.elm!.contentWindow!.postMessage(
				{ type: "save-fld-data-to-srv" },
				this.__origin
			);
			this.__hostedFields.expiryy.elm!.contentWindow!.postMessage(
				{ type: "save-fld-data-to-srv" },
				this.__origin
			);

		} else {
			this.__hostedFields.expiry.elm!.contentWindow!.postMessage(
				{ type: "save-fld-data-to-srv" },
				this.__origin
			);
		}
		if (this.__recaptchaIframeElm) {
			this.__recaptchaIframeElm!.contentWindow!.postMessage(
				{ type: "execute-recaptcha-req" },
				this.__origin
			);
		}
		return this.__paymentPageDfrd;
	}

	GetRemainingAttempts() {
		return (
			this.__paymentPageData.payment_page.number_of_failure_attempts -
			this.numberOfAttempts
		);
	}

	Upon(event: EventNames, callback: (data: any) => void) {
		addEventListener(event, (e: any) => {
			callback(e);
		});
	}

	ResetInputs() {
		this.__AwaitingFields = {
			cc: false,
			expiry: false,
			expiryy: false,
			expirym: false,
			recaptcha: false,
		};
		let fields = ['cc', 'cvv']
		if (this.__expirySeparateFields) {
			fields.push('expiryy', 'expirym')
		} else {
			fields.push('expiry')
		}

		for (const key of fields) {
			if (this.__hostedFields[key as HostedFieldsKeys]) {
				this.__hostedFields[key as HostedFieldsKeys].error = "";
				this.__hostedFields[key as HostedFieldsKeys].elm!.classList.remove(HTMLClasses.IFRAME_CLASS_ERR);
			}
		}
		this.DataInput.ResetInputs();
	}

	private initNonHostedField(key: string, obj: any, settings?: any) {
		if (obj.hasOwnProperty(key)) {
			if (!this.showField(key)) {
				this.DataInput.HideInput(key, obj)
				return
			}
			this.DataInput.SetInput(key, obj)
			if (this.__paymentPageData.customer && this.__paymentPageData.customer[key]) {
				this.DataInput.SetValue(key, obj, this.__paymentPageData.customer[key], true)
			}
			if (settings) {
				if (settings.uid) {
					obj[key].uid = settings.uid;
				}

				if (settings.hasOwnProperty("required")) {
					obj[key].required = settings.required;
				}
			}
		}
	}

	private initPaymentPage(data: any) {
		this.addCSS();
		this.initHostedFieldIframe('cc');
		if (this.__expirySeparateFields) {
			this.initHostedFieldIframe('expiryy');
			this.initHostedFieldIframe('expirym');
			this.removeFieldAndWrapper("expiry");
		} else {
			this.initHostedFieldIframe('expiry');
			this.removeFieldAndWrapper("expiryy");
			this.removeFieldAndWrapper("expirym");
		}
		this.initRecaptcha(data);
		this.initApplePayButton(data);
		this.initGooglePayButton(data);

		for (const key in this.DataInput.fields.non_hosted_fields) {
			this.initNonHostedField(key, this.DataInput.fields.non_hosted_fields);
		}
		if (
			this.__paymentPageData.payment_page.field_content_settings &&
			this.__paymentPageData.payment_page.field_content_settings.extra_fields
		) {
			for (const key in this.DataInput.fields.extra_fields) {
				if (!this.__paymentPageData.payment_page.field_content_settings
					.show_client_fields_to_fill) {
					this.DataInput.HideInput(key, this.DataInput.fields.extra_fields);
				}
				const fldSettings =
					this.__paymentPageData.payment_page.field_content_settings.extra_fields.find(
						(item: any) => item.title === key
					);
				if (fldSettings) {
					this.initNonHostedField(key, this.DataInput.fields.extra_fields, fldSettings);
				} else {
					this.DataInput.HideInput(key, this.DataInput.fields.extra_fields);
				}
			}
		}
	}

	private showField(field: string) {
		const secure3d = this.__paymentPageData.secure3d
		const payment_form_fields =
			this.__paymentPageData.payment_page.field_content_settings
				.payment_form_fields;
		const customer_details_field =
			this.__paymentPageData.payment_page.field_content_settings
				.customer_details_field;
		const show_client_fields_to_fill =
			this.__paymentPageData.payment_page.field_content_settings
				.show_client_fields_to_fill;
		switch (field) {
			case "custom_invoice_name":
				return this.__paymentPageData.payment_page.field_content_settings
					.on_behalf_of_field;
			case "card_holder_name":
				return payment_form_fields.show_cc_name || secure3d;
			case "card_holder_phone":
			case "card_holder_phone_prefix":
				return secure3d;
			case "card_holder_id":
				return payment_form_fields.show_id;
			case "payments":
				return this.__paymentPageData.payment_page.payments;
			case "customer_name":
				return show_client_fields_to_fill;
			case "vat_number":
				return show_client_fields_to_fill && customer_details_field.vat_number;
			case "phone":
				return show_client_fields_to_fill && customer_details_field.phone;
			case "email":
				return show_client_fields_to_fill && customer_details_field.email;
			case "contact_address":
				return show_client_fields_to_fill && customer_details_field.address;
			case "contact_country":
				return show_client_fields_to_fill && customer_details_field.address;
			case "notes":
				return show_client_fields_to_fill && customer_details_field.notes;
		}

		return true;
	}

	private listenForMessages() {
		window.addEventListener(
			"message",
			(event) => {
				if (event.data) {
					switch (event.data.type) {
						case "fld-validation":
							this.fld_validation(event);
							break;
						case "init":
							this.event_init(event);
							break;
						case "srv-response-msg":
							this.event_srvResponseMsg(event);
							break;
						case "srv-response-result":
							this.formResponse(event.data.data);
							break;
						case "cc-type":
							this.event_ccType(event.data.data);
							break;
						case "secure-3ds":
							this.toggleSecure3dsIframe(event.data.data)
							break;
						case "start-apple-pay":
						this.startApplePayFlow()
							break;
						case "start-google-pay":
						this.startGooglePayFlow()
							break;
						default:
							if(event.data && event.data.messageTransaction3DS != null) {
								this.toggleSecure3dsIframe(null)
								if (event.data.data.data) {
									return this.formResponse(event.data.data);
								}
								this.formResponse(event.data);
							}
					}
				}
			},
			false
		);
	}

	private event_ccType(cardType: any) {
		this.__hostedFields.cc.elm?.setAttribute("data-card-type", cardType);
		this.fireCustomEvent(EventNames.CC_TYPE_CHANGE, cardType);
	}
	private fld_validation(event: any) {
		if (event.data && event.data.data) {
			if (event.data.data.error) {
				this.__hostedFields[event.data.data.name as HostedFieldsKeys].error = event.data.data.message;
				this.__hostedFields[event.data.data.name as HostedFieldsKeys].elm!.classList.add(HTMLClasses.IFRAME_CLASS_ERR);
			} else {
				this.__hostedFields[event.data.data.name as HostedFieldsKeys].error = '';
				this.__hostedFields[event.data.data.name as HostedFieldsKeys].elm!.classList.remove(HTMLClasses.IFRAME_CLASS_ERR);
			}
		}
	}

	private event_init(event: any) {
		this.__paymentPageData = event.data.data;
		this.setPageExpiration(
			this.__paymentPageData.page_expiration_time
		);
		this.InitPaymentPage.resolve({
			data: this.__paymentPageData,
			fields:
				this.__paymentPageData.payment_page.field_content_settings
					.payment_form_fields,
		});
	}

	private event_srvResponseMsg(event: any) {
		this.__AwaitingFields[
			event.data.name as keyof typeof this.__AwaitingFields
		] = true;
		if (event.data.name == 'recaptcha') {
			this.__recaptchaToken = event.data.data;
			this.__AwaitingFields.recaptcha = false;
		} else {
			if (!event.data.data.success) {
				this.__hostedFields[event.data.name as HostedFieldsKeys].error = event.data.data.message;
				this.__hostedFields[event.data.name as HostedFieldsKeys].elm!.classList.add(HTMLClasses.IFRAME_CLASS_ERR);
				this.formResponse(event.data.data);
			}
		}
		if (this.__AwaitingFields.cc) {
			if (
				this.__AwaitingFields.expiry
				|| (this.__AwaitingFields.expirym && this.__AwaitingFields.expiryy)) {
					if (!this.__showRecaptcha || !this.__AwaitingFields.recaptcha) {
						this.readyToSubmit();
					}
			}
		}
	}

	private outOfAttempts() {
		this.fireCustomEvent(EventNames.NO_ATTEMPTED_REMAINING, null);
		this.fireCustomEvent(EventNames.PAYMENT_PAGE_KILLED, null);
		this.toggleDisableForm(false);
	}

	private setPageExpiration(mins: number) {
		setTimeout(() => {
			this.fireCustomEvent(EventNames.PAGE_EXPIRED, null);
			this.fireCustomEvent(EventNames.PAYMENT_PAGE_KILLED, null);
			this.toggleDisableForm(false);
		}, mins * 60 * 1000);
	}

	private toggleDisableForm(on: boolean) {
		for (const key in this.__hostedFields) {
			if (
				this.__hostedFields.hasOwnProperty(key)
				&& this.__hostedFields[key as HostedFieldsKeys].elm
				) {
				const element =
					this.__hostedFields[key as HostedFieldsKeys];
				element.elm!.contentWindow!.postMessage(
					{ type: "toggle-disable-form", data: on },
					this.__origin
				);
				element.elm!.classList.toggle("__payplus_hosted_field_disabled", !on);
			}
		}
	}

	private fireCustomEvent(eventName: EventNames, data: any) {
		const evnt = new CustomEvent(eventName, { detail: data });
		window.dispatchEvent(evnt);
	}

	private formResponse(data: any) {
		if (data.number_of_tries) {
			this.numberOfAttempts = parseInt(data.number_of_tries);
			if (this.GetRemainingAttempts() == 0) {
				this.outOfAttempts();
			}
		}
		if (data.success == false && data.errors && data.errors.length) {
			for (const err of data.errors) {
				if (err.field) {
					if (err.fldType == "hosted_field") {
						if (this.__hostedFields[err.field as HostedFieldsKeys].elm) {
							this.__hostedFields[err.field as HostedFieldsKeys].error = err.message;
							this.__hostedFields[err.field as HostedFieldsKeys].elm!.classList.add(HTMLClasses.IFRAME_CLASS_ERR);
						}
					} else if (err.fldType == "non_hosted_field") {
						this.DataInput.SetError(err.field, this.DataInput.fields.non_hosted_fields, err.message);
					} else if (err.fldType == "extra_fields") {
						this.DataInput.SetError(err.field, this.DataInput.fields.extra_fields, err.message);
					}
				}
			}
		}
		this.fireCustomEvent(EventNames.RESPONSE_FROM_SERVER, data);
		this.fireCustomEvent(EventNames.SUBMIT_PROCESS, false);
		this.toggleDisableForm(true);
		this.__paymentPageDfrd.resolve(data);
	}

	private collectChargeParameters() {
		this.ChargeRequest.Reset();
		const inputData = this.DataInput.GetInput()
		for (const [key, value] of Object.entries(inputData)) {
			let fieldGroup = nonHostedFieldsMapping[key] || "extra_fields";
			this.ChargeRequest.SetParam(value, key, fieldGroup);
		}
		if (this.__recaptchaToken) {
			this.ChargeRequest.SetParam(this.__recaptchaToken, 'recaptcha_hash', 'payment');
		}
	}

	private readyToSubmit() {
		this.collectChargeParameters();
		this.__hostedFields.cvv.elm!.contentWindow!.postMessage(
			{ type: "submit-payment-form-to-srv", data: this.ChargeRequest.GetData() },
			this.__origin
		);
	}

	private initHostedFieldIframe(name: HostedFieldsKeys) {
		if (!this.__hostedFields[name as HostedFieldsKeys]) {
			return
		}
		const selector = this.__hostedFields[name as HostedFieldsKeys].selector;
		const elementReplacement: HTMLIFrameElement | null = document.querySelector(selector);
		if (!elementReplacement) {
			throw new Error(`error initializing hosted field ${name}`);
		}
		const classes = elementReplacement.getAttribute("class")
			? elementReplacement.getAttribute("class")!.split(" ")
			: [];
		classes.push(HTMLClasses.IFRAME_CLASS);
		const wrapper = document.createElement("span");
		wrapper.setAttribute("class", "__payplus_hosted_fields_item_fld-wrapper");
		const iframeElm = document.createElement("iframe");
		iframeElm.setAttribute("data-uuid", this.__hosted_fields_uuid);
		iframeElm.setAttribute("class", classes.join(" "));
		iframeElm.setAttribute("id", `fld-${name}`);
		const srcAddr = new URL(this.__origin);
		srcAddr.pathname = [
			'api',
			'hosted-field',
			this.__page_request_uid,
			this.__hosted_fields_uuid,
			name].join("/");
		if (this.__hostedFieldsStyles) {
			srcAddr.searchParams.set("inStyle", this.__hostedFieldsStyles);
		}
		if (this.__hostedFields[name as HostedFieldsKeys].config) {
			srcAddr.searchParams.set("config", JSON.stringify(this.__hostedFields[name as HostedFieldsKeys].config));
		}
		iframeElm.setAttribute("src", srcAddr.toString());
		iframeElm.setAttribute("frameborder", "0");
		wrapper.appendChild(iframeElm);
		elementReplacement.replaceWith(wrapper);
		this.__hostedFields[name as HostedFieldsKeys].elm = iframeElm;
	}

	private toggleSecure3dsIframe(src: string | null) {
		if (src === null) {
			if (this.__securee3dsIframeElm) {
				this.__securee3dsIframeElm.remove();
				this.fireCustomEvent(EventNames.SECURE_3DS_WINDOW, false);
			}
			return
		}
		const iframeElm = document.createElement("iframe");
		document.body.appendChild(iframeElm);
		iframeElm.setAttribute("src", src);
		iframeElm.setAttribute("class", `hsted-Flds--r-secure3ds-iframe`);
		this.__securee3dsIframeElm = iframeElm;
		this.fireCustomEvent(EventNames.SECURE_3DS_WINDOW, true);
	}

	private startApplePayFlow() {
		this.fireCustomEvent(EventNames.SUBMIT_PROCESS, true)
		this.toggleDisableForm(false)
		this.__recaptchaIframeElm?.contentWindow?.postMessage({type: "execute-recaptcha-req"}, this.__origin)
		//TODO need to check if its works on dev with recaptcha
		this.collectChargeParameters()
		const payload = this.ChargeRequest.GetData()
		if (this.__applepayIframeElm?.contentWindow) {
			this.__applepayIframeElm.contentWindow.postMessage(
				{ type: "apple-pay-start", data: payload },
				this.__origin
			)
		} else {
			this.fireCustomEvent(EventNames.SUBMIT_PROCESS, false)
			this.toggleDisableForm(true)
			this.fireCustomEvent(EventNames.RESPONSE_FROM_SERVER, {
				success: false,
				message: "apple-pay-not-available",
			})
		}
	}

	private startGooglePayFlow() {
		this.fireCustomEvent(EventNames.SUBMIT_PROCESS, true)
		this.toggleDisableForm(false)
		this.__recaptchaIframeElm?.contentWindow?.postMessage({type: "execute-recaptcha-req"}, this.__origin)
		//TODO need to check if its works on dev with recaptcha
		this.collectChargeParameters()
		const payload = this.ChargeRequest.GetData()
		if (this.__googlepayIframeElm?.contentWindow) {
			this.__googlepayIframeElm.contentWindow.postMessage(
				{ type: "google-pay-start", data: payload },
				this.__origin
			)
		} else {
			this.fireCustomEvent(EventNames.SUBMIT_PROCESS, false)
			this.toggleDisableForm(true)
			this.fireCustomEvent(EventNames.RESPONSE_FROM_SERVER, {
				success: false,
				message: "google-pay-not-available",
			})
		}
	}

	private initRecaptcha(data:any) {
		this.__showRecaptcha = data.data.payment_page.field_content_settings.show_recaptcha;
		if (!this.__showRecaptcha) {
			return
		}
		if (this.__recaptchaReplacementElm == null) {
			throw new Error("Missing required field data");
		}
		const iframeElm = document.createElement("iframe");
		iframeElm.setAttribute("class", `hsted-Flds--r-recaptcha-iframe hsted-Flds--r-recaptcha-iframe--v3`);		
		iframeElm.setAttribute("id", `hsted-Flds--r-recaptcha-iframe`);
		iframeElm.setAttribute("scrolling", `no`);
		iframeElm.setAttribute(
			"src", [
				this.__origin,
				"api",
				"hosted-field",
				this.__page_request_uid,
				this.__hosted_fields_uuid,
				"recaptcha",
				3
			].join("/")
		);
		iframeElm.setAttribute("frameborder", "0");
		this.__recaptchaReplacementElm.replaceWith(iframeElm);
		this.__recaptchaIframeElm = iframeElm;
	}

	private initApplePayButton(data:any) {
		this.__showApplePayButton = !!(data.data.payment_page.payment_methods?.find((i:any) => i?.payment_method_type_key === "apple-pay"))
		if (!this.__showApplePayButton) {
			return
		}

		// @ts-ignore
		if (!window?.ApplePaySession || !window?.ApplePaySession?.canMakePayments()) {
			console.log("Cannot process Apple Pay on this device/browser.")
			return
		}

		if (!this.__applepayReplacementElm) {
			return
		}
		const iframeElm = document.createElement("iframe")
		iframeElm.setAttribute("class", `hsted-Flds--apple-pay-iframe`)
		iframeElm.setAttribute("id", `hsted-Flds--apple-pay-iframe`)
		iframeElm.setAttribute("scrolling", `no`)
		iframeElm.setAttribute("allow", "payment *")
		iframeElm.setAttribute("allowpaymentrequest", "true")
		iframeElm.setAttribute(
			"src",
			[
				this.__origin,
				"api",
				"hosted-field",
				this.__page_request_uid,
				this.__hosted_fields_uuid,
				"apple-pay"
			].join("/")
		);
		iframeElm.setAttribute("frameborder", "0");
		this.__applepayReplacementElm.replaceWith(iframeElm);
		this.__applepayIframeElm = iframeElm;
	}

	private initGooglePayButton(data:any) {
		this.__showGooglePayButton = !!(data.data.payment_page.payment_methods?.find((i:any) => i?.payment_method_type_key === "google-pay"))
		if (!this.__showGooglePayButton) {
			console.log("Google Pay not available. Call PayPlus To add it to your account.")
			return
		}
		if (!this.__googlepayReplacementElm) {
			return
		}
		const iframeElm = document.createElement("iframe")
		iframeElm.setAttribute("class", `hsted-Flds--google-pay-iframe`)
		iframeElm.setAttribute("id", `hsted-Flds--google-pay-iframe`)
		iframeElm.setAttribute("scrolling", `no`)
		iframeElm.setAttribute("allow", "payment *")
		iframeElm.setAttribute(
			"src",
			[
				this.__origin,
				"api",
				"hosted-field",
				this.__page_request_uid,
				this.__hosted_fields_uuid,
				"google-pay"
			].join("/")
		);
		iframeElm.setAttribute("frameborder", "0");
		this.__googlepayReplacementElm.replaceWith(iframeElm);
		this.__googlepayIframeElm = iframeElm;
	}

	private hideCVVIframe() {
		if (this.__hostedFields.cvv.wrapperSelector) {
			const wrapperELM = document.querySelector(
				this.__hostedFields.cvv.wrapperSelector
			) as HTMLElement;
			if (wrapperELM !== null) {
				wrapperELM.style.display = "none";
			}
		}
	}

	private removeFieldAndWrapper(fieldName: HostedFieldsKeys) {
		if (this.__hostedFields[fieldName].selector) {
			let elm = document.querySelector(this.__hostedFields.expiry.selector);
			if (elm) {
				elm.remove();
			}
			if (this.__hostedFields[fieldName].wrapperSelector) {
				let wrapper = document.querySelector(this.__hostedFields[fieldName].wrapperSelector);
				if (wrapper) {
					wrapper.remove();
				}
			}
		}
	}

	private validateOrThrow() {
		const hostedFieldsKeys = Object.keys(this.__hostedFields)
		if (hostedFieldsKeys.length !== HostedFieldsKeysList.length) {
			throw new Error("Hosted fields are not fully initialized");
		}
	}

	private addCSS() {
		const css = 
			[`.hsted-Flds--r-recaptcha-iframe.hsted-Flds--r-recaptcha-iframe--v3 {
				right: -187px;
				position: fixed;
				width: 257px;
				height: 63px;
			}.hsted-Flds--r-recaptcha-iframe.hsted-Flds--r-recaptcha-iframe--v3:hover {
				right : 0 !important;
				transition: right 0.3s ease 0s !important;
			}
			.hsted-Flds--apple-pay-iframe {
				width: 100%;
				height: 48px;
				border: 0;
			}
			.hsted-Flds--google-pay-iframe {
				width: 100%;
				height: 48px;
				border: 0;
			}`];
		if (!this.config.Secure3Ds.ResetStyle) {
			css.push(`.hsted-Flds--r-secure3ds-iframe{
				position: fixed;
				width: 500px;
				height: 500px;
				top: 0;
				bottom: 0;
				left: 0;
				right: 0;
				margin: auto;
				z-index: 999999;
			}`);
		}
		const style = document.createElement('style');
		style.appendChild(document.createTextNode(css.join("")));
		document.head.appendChild(style);
	}
}