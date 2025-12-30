"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFormState } from 'react-dom'
import { resetPassword } from '@/app/auth/actions'
import { useSearchParams } from "next/navigation";
import { Suspense } from "react"

function GetCodeHiddenInput() {
    const searchParams = useSearchParams();
    return <Input type="hidden" name="code" value={searchParams.get('code')!} />
}

export default function ResetPasswordForm() {
    const initialState = {
        message: ''
    }
    const [formState, formAction] = useFormState(resetPassword, initialState)

    return (
        <form action={formAction} className="space-y-4">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="Enter new password"
                        name="password"
                        required
                        minLength={6}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm Password</Label>
                    <Input
                        id="confirm_password"
                        type="password"
                        placeholder="Confirm password"
                        name="confirm_password"
                        required
                        minLength={6}
                    />
                </div>
                <Suspense>
                    <GetCodeHiddenInput />
                </Suspense>
            </div>
            <Button className="w-full" type="submit">Update Password</Button>
            {formState?.message && (
                <p className="text-sm text-destructive text-center">{formState.message}</p>
            )}
        </form>
    )
}
