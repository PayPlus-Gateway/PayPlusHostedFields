import BaseDataInput from "./BaseDataInput";
import { ExtraFieldData, HTMLClasses, NonHostedFields, nonHostedFieldFieldsList } from "./types";

class Dom extends BaseDataInput {
    fields: NonHostedFields = {} as any;

    constructor() {
        super();
        this.fields.non_hosted_fields = {} as any;
        this.fields.extra_fields = {} as any;
    }

    SetError(key: string, obj: any, error: string) {
        if (obj[key] && obj[key].elm) {
            obj[key].elm.classList.add(HTMLClasses.IFRAME_CLASS_ERR);
            obj[key].error = error;
        }
    }

    SetValue(key: string, obj: any, value: any, readOnly: boolean = false) {
        if (obj[key].elm) {
            obj[key].elm!.value = value;
            if (readOnly) {
                obj[key].elm!.setAttribute("readonly", "true");
            }
        }
    }

    SetInput(key: string, obj: any) {
        const element: any = obj[key];
        obj[key].elm = document.querySelector(element.selector) as HTMLInputElement;
    }

    HideInput(key: string, obj: any) {
        if (
            obj[
                key
            ].wrapperSelector
        ) {
            const wrapperELM = document.querySelector(
                obj[
                    key
                ].wrapperSelector
            ) as HTMLElement;
            if (wrapperELM !== null) {
                wrapperELM.remove();
            }
        }
    }

    ResetInputs() {
        for (const key in this.fields.non_hosted_fields) {
            if (
                this.fields.non_hosted_fields.hasOwnProperty(key)
                && this.fields.non_hosted_fields[key as keyof Dom["fields"]["non_hosted_fields"]].elm
            ) {
                const element =
                    this.fields.non_hosted_fields[
                    key as keyof Dom["fields"]["non_hosted_fields"]
                    ];
                if (element.elm) {
                    element.elm.classList.remove(HTMLClasses.IFRAME_CLASS_ERR);
                    element.error = "";
                }
            }
        }

        for (const key in this.fields.extra_fields) {
            if (
                this.fields.extra_fields.hasOwnProperty(key)
                && this.fields.extra_fields[key as keyof ExtraFieldData].elm
            ) {
                const element =
                    this.fields.extra_fields[key as keyof ExtraFieldData];
                element.elm!.classList.remove(HTMLClasses.IFRAME_CLASS_ERR);
                element.error = "";
            }
        }
    }

    GetInput() {
        const result: any = {}
        for (const key in this.fields.non_hosted_fields) {
            if (this.fields.non_hosted_fields.hasOwnProperty(key)) {
                const element =
                    this.fields.non_hosted_fields[
                    key as keyof Dom["fields"]["non_hosted_fields"]
                    ];
                if (element && element.elm) {
                    result[key] = element.elm.value
                }
            }
        }

        for (const key in this.fields.extra_fields) {
            if (this.fields.extra_fields.hasOwnProperty(key)) {
                const element = this.fields.extra_fields[key as keyof ExtraFieldData];
                if (element && element.elm) {
                    result[element.uid as string] = element.elm.value
                }
            }
        }

        return result;
    }

    public AddField(fld: string, elmSelector: string, wrapperElmSelector?: string) {
        if (nonHostedFieldFieldsList.includes(fld)) {
            this.fields.non_hosted_fields[fld as keyof Dom["fields"]["non_hosted_fields"]] = {
                selector: elmSelector,
                wrapperSelector: wrapperElmSelector || "",
            };
        } else {
            this.fields.extra_fields[
                fld as keyof Dom["fields"]["extra_fields"]
            ] = {
                selector: elmSelector,
                wrapperSelector: wrapperElmSelector || "",
            };
        }
    }
}

export default Dom;