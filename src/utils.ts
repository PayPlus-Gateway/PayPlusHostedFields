function deferred() {
	let thens: any = [];
	let catches: any = [];

	let status: any;
	let resolvedValue: any;
	let rejectedError: any;

	return {
		resolve: (value: any) => {
			status = "resolved";
			resolvedValue = value;
			thens.forEach((t: any) => t(value));
			thens = [];
		},
		reject: (error: any) => {
			status = "rejected";
			rejectedError = error;
			catches.forEach((c: any) => c(error));
			catches = [];
		},
		then: (cb: any) => {
			if (status === "resolved") {
				cb(resolvedValue);
			} else {
				thens.unshift(cb);
			}
		},
		catch: (cb: any) => {
			if (status === "rejected") {
				cb(rejectedError);
			} else {
				catches.unshift(cb);
			}
		},
	};
}



export { deferred };