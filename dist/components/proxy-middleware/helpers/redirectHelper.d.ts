export function shouldMakeExternalRequest(ctx: any, action: any): boolean;
export function makeExternalRequest(ctx: any, url: any): Promise<{
    status: boolean;
    responseData: {
        headers: any;
        status_code: any;
        body: any;
    };
}>;
