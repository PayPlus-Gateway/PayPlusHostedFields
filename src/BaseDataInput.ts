import { NonHostedFields } from "./types";

abstract class BaseDataInput {
    abstract fields: NonHostedFields

    public abstract SetError(key: string, obj: any, error: string): void;

    public abstract SetValue(key: string, obj: any, value: any, readOnly?: boolean): void

    public abstract SetInput(key: string, obj: any): void

    public abstract HideInput(key: string, obj: any): void

    public abstract ResetInputs(): void

    public abstract GetInput(): string

    public abstract AddField(fld: string, elmSelector: string, wrapperElmSelector?: string): void
}

export default BaseDataInput;