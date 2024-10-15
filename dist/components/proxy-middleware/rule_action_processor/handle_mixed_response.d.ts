export default handleMixedResponse;
declare function handleMixedResponse(ctx: any, destinationUrl: any): Promise<{
    status: boolean;
    response_data: {
        headers: {
            "Cache-Control": string;
        };
        status_code: number;
        body: any;
    };
} | {
    status: boolean;
    response_data: {
        headers: {
            "Content-Type": string;
            "Content-Length": number;
            "Cache-Control": string;
        } | {
            "Cache-Control": string;
            "Content-Type"?: undefined;
            "Content-Length"?: undefined;
        };
        status_code: number;
        body: string;
    };
} | {
    status: boolean;
    response_data?: undefined;
}>;
