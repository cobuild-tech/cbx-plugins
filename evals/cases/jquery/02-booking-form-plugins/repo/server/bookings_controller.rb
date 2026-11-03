class BookingsController < ApplicationController
  def create
    date = Date.strptime(params[:ship_date], '%d/%m/%Y')
    Booking.create!(name: params[:name], ship_date: date, slot_id: params[:slot])
    redirect_to bookings_path
  end
end
