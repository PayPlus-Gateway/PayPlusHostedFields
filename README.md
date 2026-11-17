# payplus-hosted-fields

Browser SDK for PayPlus hosted fields. It replaces placeholder elements on your page with PayPlus-hosted iframes for the card number, expiry and CVV, takes control of the rest of your payment form, and submits the charge through the hosted fields.

A full working demo is available in the [hosted-fields-sample](https://github.com/PayPlus-Gateway/hosted-fields-sample) repository.

## Installation

```bash
npm i payplus-hosted-fields
```

Load `dist/payplus-hosted-fields.min.js` on your page. It exposes `window.PayPlusHostedFieldsDom`.

## Usage

```javascript
const hf = new PayPlusHostedFieldsDom();

hf.SetMainFields({
	cc: { elmSelector: "#cc", wrapperElmSelector: "#cc-wrapper" },
	expiry: { elmSelector: "#expiry", wrapperElmSelector: ".expiry-wrapper-full" },
	expirym: { elmSelector: "#expirym", wrapperElmSelector: ".expiry-wrapper" },
	expiryy: { elmSelector: "#expiryy", wrapperElmSelector: ".expiry-wrapper" },
	cvv: { elmSelector: "#cvv", wrapperElmSelector: "#cvv-wrapper" },
})
	.AddField("card_holder_id", "#id-number", "#id-number-wrapper")
	.AddField("card_holder_name", "#card-holder-name", "#card-holder-name-wrapper")
	.AddField("card_holder_phone", "#card-holder-phone", "#card-holder-phone-wrapper")
	.AddField("payments", "#payments", "#payments-wrapper")
	.SetRecaptcha("#recaptcha")
	.SetApplePay("#apple-pay")
	.SetGooglePay("#google-pay");

await hf.CreatePaymentPage({
	origin: "https://restapi.payplus.co.il", // or https://restapidev.payplus.co.il
	page_request_uid: "...",
	hosted_fields_uuid: "...",
});

document.querySelector("#submit").addEventListener("click", () => {
	hf.SubmitPayment().then((response) => {
		// same data as the pp_responseFromServer event
	});
});
```

### Methods

* **SetMainFields(fields)**: maps the hosted fields (`cc`, `cvv`, `expiry`, `expiryy`, `expirym`). All five are required; the SDK keeps either `expiry` or `expirym`/`expiryy` depending on the payment page configuration.
* **AddField(name, elmSelector, wrapperElmSelector?)**: maps a field hosted on your page. Known names are `name`, `payments`, `card_holder_id`, `card_holder_name`, `card_holder_phone`, `card_holder_phone_prefix`, `custom_invoice_name`, `customer_name`, `vat_number`, `phone`, `email`, `contact_address`, `contact_country` and `notes`. Any other name is treated as a custom field defined on the payment page. Fields the page doesn't use are hidden.
* **SetRecaptcha(elmSelector)**: element to be replaced by the reCAPTCHA iframe. Required when the payment page uses reCAPTCHA. See [reCAPTCHA](#recaptcha).
* **SetApplePay(elmSelector)** / **SetGooglePay(elmSelector)**: elements to be replaced by the wallet buttons, when those payment methods are enabled.
* **SetHostedFieldsStyles(css)**: CSS injected into the hosted field iframes.
* **SetConfig(key, value)**: for example `SetConfig("Secure3Ds.ResetStyle", true)` to style the 3D Secure iframe (`.hsted-Flds--r-secure3ds-iframe`) yourself.
* **CreatePaymentPage({ origin, page_request_uid, hosted_fields_uuid })**: starts the hosted fields. `hf.InitPaymentPage.then(...)` fires once the page data has loaded.
* **SubmitPayment()**: validates and submits the payment. Returns a promise-like object that resolves with the server response. Each call submits at most one charge.
* **GetRemainingAttempts()**: number of payment attempts left.
* **Upon(eventName, callback)**: subscribes to an event. The callback receives a `CustomEvent`; its data is in `e.detail`.

## reCAPTCHA

When the payment page is protected by reCAPTCHA, `SetRecaptcha` must point at an element on your page. The SDK supports both versions, following the payment page configuration:

* **v3 (invisible)**: the element is replaced by the reCAPTCHA badge, fixed to the right edge of the window. A token is requested on every `SubmitPayment()`. If no token can be obtained within about 15 seconds, the submit resolves with `{ success: false, message: "recaptcha-confirmation-is-missing" }` and nothing is charged.
* **v2 (checkbox)**: the element is replaced by the "I'm not a robot" checkbox (304×78). The customer must solve it before paying; otherwise `SubmitPayment()` resolves immediately with `{ success: false, message: "recaptcha-confirmation-is-missing" }`. While the image challenge is open, the iframe grows to `width: 100%; height: 600px`, so place the element where it has room to expand. Tokens are single use, so the checkbox is reset after every charge attempt and must be solved again before retrying.

If PayPlus declines a v3 payment as suspicious (`recaptcha-declined-your-request` or `recaptcha-is-under-trust-score`), the page switches to v2: the badge is replaced by the checkbox in the same place, and `pp_recaptchaVersionChange` fires with `2`. Use it to ask the customer to confirm they're not a robot and try again.

Wallets: with v3, Apple Pay and Google Pay use a token fetched in the background. With v2, the wallet buttons are disabled (class `hsted-Flds--wallet-blocked`) until the checkbox is solved, and `pp_walletsBlocked` fires so you can explain why.

The reCAPTCHA iframe has the class `hsted-Flds--r-recaptcha-iframe` plus `hsted-Flds--r-recaptcha-iframe--v3` or `hsted-Flds--r-recaptcha-iframe--v2`, and `hsted-Flds--r-recaptcha-iframe--challenge` while the v2 challenge is open, if you need to override the default styles.

## Events

```javascript
hf.Upon("pp_responseFromServer", (e) => console.log(e.detail));
```

* **pp_responseFromServer**: a response from the server (or a client-side failure such as `recaptcha-confirmation-is-missing`). Check `e.detail.success`.
* **pp_submitProcess**: `true` when a submit starts, `false` when it ends. Useful for a loader or disabling the submit button.
* **pp_noAttemptedRemaining**: the customer has used all payment attempts.
* **pp_pageExpired**: the payment page expired.
* **pp_paymentPageKilled**: the payment page can no longer be used. Fires together with the two events above.
* **pp_ccTypeChange**: the card brand was detected from the digits typed.
* **pp_secure3dsWindow**: `true` when the 3D Secure window opens, `false` when it closes.
* **pp_recaptchaVersionChange**: the reCAPTCHA version changed at runtime. `e.detail` is the new version (currently always `2`, after a v3 decline).
* **pp_recaptchaChallenge**: `true` when the v2 image challenge opens, `false` when it closes.
* **pp_walletsBlocked**: `true` when the wallet buttons are disabled until the v2 checkbox is solved, `false` when they are enabled again.
