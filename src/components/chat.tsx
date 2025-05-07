"use client"
import { socket as socketIo } from "@/socket"
import React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

// Define the form schema with Zod
const formSchema = z.object({
    message: z.string().min(1, {
        message: "Message cannot be empty",
    }),
})

type FormValues = z.infer<typeof formSchema>

export const Chat = ({lobbyId}: {lobbyId: string}) => {
    const [socket, setSocket] = React.useState<typeof socketIo | null>(null)
    const [messages, setMessages] = React.useState<string[]>([])
    const messagesEndRef = React.useRef<HTMLDivElement | null>(null)

    // Define form
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            message: "",
        },
    })

    const createSocket = () => {
        const newSocket = socketIo
        setSocket(newSocket)

        newSocket.off("message");
        newSocket.on("message", (message: string) => {
            setMessages((prevMessages) => [...prevMessages, message])
        })
    }

    React.useEffect(() => {
        createSocket()
        return () => {
            if (socket) {
                socket.disconnect()
            }
        }
    }, [])

    const onSubmit = (data: FormValues) => {
        if (socket && data.message.trim()) {
            socket.emit("clientMessage", {message: data.message, lobbyId: lobbyId})
            form.reset({ message: "" })
        }
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    React.useLayoutEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (!socket) {
        return null
    }

    return (
        <div className="absolute flex flex-col bottom-0 left-0 right-0 p-4 m-2 max-w-96 min-h-96 max-h-96 rounded-lg shadow-lg border-4 border-[#5a6e4a] bg-[#f5f2e3] text-[#3d2c12]">
            <h2 className="text-lg font-bold border-b-2 border-[#5a6e4a] pb-2 px-2 text-center font-pixel">Chat</h2>
            <div className="overflow-y-auto flex-1 my-2 px-2 bg-[#e8e4d0] rounded-md">
                {messages.map((msg, index) => (
                    <div key={index} className="p-1 my-1 bg-[#d8d4c0] rounded-md border border-[#5a6e4a]">
                        {msg}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center justify-center space-x-2">
                    <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormControl>
                                    <Input
                                        placeholder="Type a message..."
                                        {...field}
                                        className="h-10 p-2 border-2 border-[#5a6e4a] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8bba5f] bg-[#e8e4d0]"
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <Button
                        type="submit"
                        className="h-10 transition duration-200 bg-[#8bba5f] hover:bg-[#7aa54e] text-[#3d2c12] border-2 border-[#5a6e4a] rounded-md font-medium px-4"
                    >
                        Send
                    </Button>
                </form>
            </Form>
        </div>
    )
}
