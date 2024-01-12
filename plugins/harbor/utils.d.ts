export declare const harborUrl: string;
export declare const harborUser: string;
export declare const harborPassword: string;
export declare const getRobotPermissions: (projectName: any) => {
    name: string;
    duration: number;
    description: any;
    disable: boolean;
    level: string;
    permissions: {
        namespace: any;
        kind: string;
        access: {
            resource: string;
            action: string;
        }[];
    }[];
};
