"use client"

import {LoginForm} from "@/lib/schemas"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"

export default function LoginPage() {
    const form = useForm({
        resolver: zodResolver(LoginForm),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    const onSubmit = (data: { email: string; password: string; }) => {
        console.log(data)
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div
                className="flex flex-col items-center justify-center border border-black p-8 rounded-lg bg-gray-100 shadow-lg space-y-6 w-full max-w-md">
                <h1 className="font-bold text-4xl">Monkey Race</h1>
                <p className="text-lg"> Math game about monkeys racing </p>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({field}) => (
                                <FormItem className={'gap-0.5'}>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="Enter your email" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                    <FormDescription className={'text-xs'}>
                                        Your email address.
                                    </FormDescription>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({field}) => (
                                <FormItem className={'gap-0.5'}>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="Enter your password" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                    <FormDescription className={'text-xs'}>
                                        Your private password.
                                    </FormDescription>
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className={"w-full mt-6 hover:cursor-pointer"}>
                            Login
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    )
}

