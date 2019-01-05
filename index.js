import './style'
import { Component } from 'preact'
import myState from './state.js'

const apiVer = 3

const remote =
  process.env.NODE_ENV === 'production'
    ? 'https://busti.club/v' + apiVer + '/nhatro'
    : 'http://' + location.hostname + ':5000/v' + apiVer + '/nhatro'

export default class App extends Component {
  state = myState

  calculateMonths = year => {
    const _MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const DATE = new Date()
    const toDay = DATE.getDate()
    let currentMonth = DATE.getMonth() + toDay > 5 ? 1 : 0
    const currentYear = DATE.getFullYear()
    let MONTHS
    if (year === 2018) {
      if (toDay > 5) {
        MONTHS = _MONTHS.slice(8)
        currentMonth = 12
      } else {
        MONTHS = _MONTHS.slice(8, 11)
        currentMonth = 11
      }
    } else if (year === currentYear) MONTHS = _MONTHS.slice(0, currentMonth)
    else MONTHS = _MONTHS
    this.setState({ month: currentMonth, year: year, months: MONTHS.reverse(), sthChanged: true })
  }

  componentWillMount = () => {
    const DATE = new Date()
    const YEAR = DATE.getFullYear()
    const M = DATE.getMonth()
    let y = 2019
    if (!M) y++
    const YEARS = [2018]
    while (y <= YEAR) {
      YEARS.unshift(y)
      y++
    }
    this.setState({ years: YEARS })
    if (M) this.calculateMonths(YEAR)
    else this.calculateMonths(YEAR - 1)
  }

  componentDidMount() {
    const token = localStorage.getItem('adminToken')
    if (token) {
      this.setState({ token: token })
      this.login(token)
    }
  }

  onInput = event => {
    const name = event.target.name
    const value = event.target.value
    switch (name) {
      case 'dien':
      case 'nuoc':
      case 'nha':
      case 'deposit':
        this.setState({ [name]: Number(value) })
        break

      default:
        this.setState({ [name]: value })
    }
  }

  onYearSelect = e => this.calculateMonths(Number(e.target.value))

  onMonthSelect = e => this.setState({ month: Number(e.target.value), sthChanged: true })

  btnClick = event => {
    event.preventDefault()
    const eventName = event.target.name
    switch (eventName) {
      case 'login':
      case 'dialogok':
        this.login()
        break
      case 'next':
        if (this.state.roomIndex > -1 && this.state.roomIndex < this.state.datas.length - 1)
          this.setState({ roomIndex: this.state.roomIndex + 1 })
        else this.setState({ roomIndex: 0 })
        break
      case 'prev':
        if (this.state.roomIndex) this.setState({ roomIndex: this.state.roomIndex - 1 })
        else this.setState({ roomIndex: this.state.datas.length - 1 })
        break
      case 'out':
      case 'purchase':
        this.setState({ confirm: eventName })
        break
      case 'ok':
        this.confirmAction(this.state.confirm)
        break
      case 'cancel':
        this.setState({ confirm: '', reg: false })
        break
      case 'reg':
        this.setState({
          reg: true,
          dien: 0,
          nuoc: 0,
        })
        break
      case 'bill-out':
        this.confirmAction('update', 'out')
        break
      case 'bill-out-cancel':
        this.confirmAction('update', 'cancel')
        break
      case 'in':
      case 'update':
        this.confirmAction(eventName)
        break
    }
  }

  confirmAction = (action, info) => {
    if (action) {
      const room = this.state.datas[this.state.roomIndex].room
      const body = JSON.stringify({
        room: room,
        action: action,
        token: this.state.token,
        name: this.state.name,
        phone: this.state.phone,
        email: this.state.email,
        // dienkytruoc: this.state.datas[this.state.roomIndex].bills[0].dien,
        dien: this.state.dien,
        // nuockytruoc: this.state.datas[this.state.roomIndex].bills[0].nuoc,
        nuoc: this.state.nuoc,
        nha: this.state.nha,
        month: this.state.month,
        year: this.state.year,
        preout: info,
        deposit: this.state.deposit,
        khoan: 'Tiền cọc',
      })
      console.log(body)
      this.setState({ loading: true, notice: 'Đang xác nhận...' })
      fetch(remote + '/chunha/action', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      })
        .then(res => {
          this.setState({ loading: false, notice: 'Đang xử lý dữ liệu...' })
          if (res.status === 200) {
            res
              .json()
              .then(json => {
                console.log(json)
                const dataClone = this.state.datas.slice(0)
                dataClone[this.state.roomIndex].bills[0] = json
                this.setState({
                  datas: dataClone,
                  notice: '',
                  confirm: '',
                  newActive: json.new,
                  reg: false,
                  update: false,
                  dien: json.dien,
                  nuoc: json.nuoc,
                })
              })
              .catch(e => this.setState({ notice: `Có lỗi: ${e.name}: ${e.message}` }))
          } else if (res.status === 406) {
            this.setState({ datas: [], token: '', notice: 'Auth reject' })
            localStorage.removeItem('adminToken')
          } else this.setState({ notice: 'Không có dữ liệu' })
        })
        .catch(e => this.setState({ notice: `Có lỗi: ${e.name}: ${e.message}` }))
    }
  }

  login = token => {
    if (this.state.sthChanged) {
      const body = JSON.stringify({
        room: '123',
        pass: this.state.pass,
        token: token || this.state.token,
        month: this.state.month,
        year: this.state.year,
      })
      console.log('fetch body', body)
      if (token) this.setState({ loading: true, notice: 'Đang tải dữ liệu...' })
      else this.setState({ loading: true, notice: 'Đang đăng nhập...' })
      fetch(remote + '/chunha', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      })
        .then(res => {
          // console.log(res.status)
          this.setState({
            loading: false,
            notice: `Tải xong dữ liệu, đang chuyển trang`,
            dialog: false,
          })
          if (res.status === 200) {
            res
              .json()
              .then(json => {
                console.log(json)
                localStorage.setItem('adminToken', json.token)
                const LEN = process.env.NODE_ENV === 'production' ? 18 : 19
                // const LEN = 18
                this.setState({
                  datas: json.datas.slice(0, LEN),
                  token: json.token,
                  notice: '',
                  sthChanged: false,
                })
              })
              .catch(e => this.setState({ notice: `Có lỗi: ${e.name}: ${e.message}` }))
          } else if (res.status === 405) this.setState({ notice: 'Sai Mật khẩu' })
          else if (res.status === 406) {
            this.setState({
              datas: [],
              token: '',
              notice: 'Auth reject',
            })
            localStorage.removeItem('adminToken')
          } else this.setState({ notice: 'Không có dữ liệu' })
        })
        .catch(e => this.setState({ notice: `Có lỗi: ${e.name}: ${e.message}` }))
    }
  }

  renderSelect = (label, name, fx) => {
    const array = name + 's'
    return (
      <div>
        <label for={name}>{label.toUpperCase()}</label>
        <div>
          <select name={name} value={this.state[name]} onChange={this[fx]}>
            <option value="" disabled>
              Chọn {name}
            </option>
            {this.state[array].map((el, i) => {
              return (
                <option key={i} value={el}>
                  {el}
                </option>
              )
            })}
          </select>
        </div>
      </div>
    )
  }

  renderOtherFee = khac => {
    if (khac.tien)
      return (
        <div class="total">
          <div>{khac.khoan ? khac.khoan.toUpperCase() : 'KHÁC'}</div>
          <div>{khac.tien.toLocaleString('vi')} đ</div>
        </div>
      )
  }

  renderBill = bill => {
    if (!bill) return <h1>PHÒNG TRỐNG</h1>
    else if (bill.tongcong) {
      return (
        <div class="bill">
          <div class="table">
            <div class="bold border-bottom">
              <div>ĐIỆN - {bill.dien.gia.toLocaleString('vi')} đ/số</div>
            </div>
            <div class="border-bottom">
              <div>Số kỳ này</div>
              <div>{bill.dien.sokynay.toLocaleString('vi')}</div>
            </div>
            <div class="border-bottom">
              <div>Số kỳ trước</div>
              <div>{bill.dien.sokytruoc.toLocaleString('vi')}</div>
            </div>
            <div>
              <div>Tiêu thụ</div>
              <div>{bill.dien.tieuthu.toLocaleString('vi')} số</div>
            </div>
            <div class="total">
              <div>TIỀN ĐIỆN</div>
              <div>{bill.dien.thanhtien.toLocaleString('vi')} đ</div>
            </div>
            <div class="bold border-bottom">
              <div>NƯỚC - {bill.nuoc.gia.toLocaleString('vi')} đ/số</div>
            </div>
            <div class="border-bottom">
              <div>Số kỳ này</div>
              <div>{bill.nuoc.sokynay.toLocaleString('vi')}</div>
            </div>
            <div class="border-bottom">
              <div>Số kỳ trước</div>
              <div>{bill.nuoc.sokytruoc.toLocaleString('vi')}</div>
            </div>
            <div>
              <div>Tiêu thụ</div>
              <div>{bill.nuoc.tieuthu.toLocaleString('vi')} số</div>
            </div>
            <div class="total">
              <div>TIỀN NƯỚC</div>
              <div>{bill.nuoc.thanhtien.toLocaleString('vi')} đ</div>
            </div>
            {this.renderOtherFee(bill.khac)}
            <div class="total">
              <div>TIỀN RÁC</div>
              <div>{bill.rac.toLocaleString('vi')} đ</div>
            </div>
            <div class="total">
              <div>TIỀN NHÀ</div>
              <div>{bill.nha.toLocaleString('vi')} đ</div>
            </div>
            <div>
              <div class="flex space-between bold grandTotal">
                <div>T.CỘNG: </div>
                <div>{bill.tongcong.toLocaleString('vi')} đ</div>
              </div>
            </div>
          </div>
        </div>
      )
    } else return <h1>CHƯA CÓ DỮ LIỆU!!</h1>
  }

  renderConfirm = d => {
    const thuchiString = d.bills[0].tongcong > 0 ? 'thu' : 'chi'
    const mess = `"OK" xác nhận đã ${thuchiString} tiền phòng ${d.room} tháng ${d.month}/${
      d.year
    } số tiền ${d.bills[0].tongcong.toLocaleString('vi')} đ`
    return (
      <div class="app">
        <h2>{mess}</h2>
        <button name="ok" class="large" onClick={this.btnClick}>
          OK
        </button>
        <button name="cancel" class="large" onClick={this.btnClick}>
          HỦY
        </button>
        {this.renderLoading()}
      </div>
    )
  }

  renderRoomButton = (bill, prev, next) => {
    return (
      <div>
        {this.renderBill(bill)}
        <div class="btnGroup">
          <button name="prev" onClick={this.btnClick}>
            {prev.room}
          </button>
          <button
            name={bill.out ? 'out' : 'purchase'}
            onClick={this.btnClick}
            className={this.buttonStatus(bill).className}
            disabled={this.buttonStatus(bill).disabled}
          >
            {this.buttonStatus(bill).label}
          </button>
          <button name="next" onClick={this.btnClick}>
            {next.room}
          </button>
        </div>
        <button onClick={() => this.setState({ showAll: true })}>DANH SÁCH PHÒNG</button>
        <button name="reg" className={!bill ? '' : 'hidden'} onClick={this.btnClick}>
          NHẬN PHÒNG
        </button>
        <button
          disabled={bill.thanhtoan}
          className={bill ? '' : 'hidden'}
          onClick={() =>
            this.setState({
              update: true,
              dien: bill.dien.sokynay || bill.dien.sokytruoc,
              nuoc: bill.nuoc.sokynay || bill.nuoc.sokytruoc,
              nha: '',
            })
          }
        >
          CẬP NHẬT
        </button>
      </div>
    )
  }

  renderBills = (bills, prev, next) => {
    if (bills.length) return <div>{bills.map(bill => this.renderRoomButton(bill, prev, next))}</div>
    else return <div>{this.renderRoomButton(false, prev, next)}</div>
  }

  renderRoom = datas => {
    const index = this.state.roomIndex
    const lastIndex = datas.length - 1
    const d = datas[index]
    if (this.state.confirm) return this.renderConfirm(d)
    else {
      let prev, next
      if (index && index < lastIndex) {
        prev = datas[index - 1]
        next = datas[index + 1]
      } else if (index === 0) {
        prev = datas[lastIndex]
        next = datas[1]
      } else if (index === lastIndex) {
        prev = datas[index - 1]
        next = datas[0]
      }
      return (
        <div class="app">
          <h2>{`${d.room} - ${d.month}/${d.year}`}</h2>
          {this.renderBills(d.bills, prev, next)}
        </div>
      )
    }
  }

  buttonStatus = bill => {
    if (!bill)
      return {
        label: 'TRỐNG',
        className: 'empty',
        empty: true,
      }
    else
      return {
        label: bill.tongcong
          ? bill.thanhtoan
            ? `ĐÃ THU${bill.out ? ' (TRỐNG)' : ''}`
            : bill.out
            ? 'BẤM ĐỂ THU VÀ TRẢ PHÒNG'
            : 'BẤM ĐỂ THU'
          : 'CHƯA CÓ DỮ LIỆU',
        className: bill.tongcong ? (bill.thanhtoan ? (bill.out ? 'out' : 'done') : '') : 'invalid',
        valid: bill.tongcong,
        disabled: !bill.tongcong || (bill.tongcong && bill.thanhtoan),
      }
  }

  calculateTotalAmount = () => {
    const amount = { in: 0, out: 0, inTotal: 0, outTotal: 0 }
    this.state.datas.map(data => {
      data.bills.map(bill => {
        if (bill.thanhtoan) {
          if (bill.out) amount.out += bill.tongcong
          else amount.in += bill.tongcong
        }
        if (bill.out) amount.outTotal += bill.tongcong
        else amount.inTotal += bill.tongcong
      })
    })
    amount.inLeft = amount.inTotal - amount.in
    amount.outLeft = amount.outTotal - amount.out
    amount.grandTotal = amount.inTotal + amount.outTotal
    amount.current = amount.in + amount.out
    amount.totalLeft = amount.grandTotal - amount.current
    return amount
  }

  renderRoomGeneralInfo = bills => {
    const infos = bills.map(bill =>
      this.buttonStatus(bill).valid ? `\n${bill.tongcong.toLocaleString('vi')}` : ''
    )
    return infos.join('')
  }

  renderListRoomsTable = () => {
    const labels = [
      'Phải thu',
      'Đã thu',
      'Còn phải thu',
      'Phải chi',
      'Đã chi',
      'Còn phải chi',
      'TC phải thu',
      'TC đã thu',
      'TC còn phải thu',
    ]
    const value = [
      'inTotal',
      'in',
      'inLeft',
      'outTotal',
      'out',
      'outLeft',
      'grandTotal',
      'current',
      'totalLeft',
    ]
    return (
      <div class="general-income">
        {labels.map((label, idx) => {
          return (
            <div>
              <h3>{label}</h3>
              <h3>{this.calculateTotalAmount()[value[idx]].toLocaleString('vi')}</h3>
            </div>
          )
        })}
      </div>
    )
  }

  renderListRooms = datas => {
    return (
      <div class="app">
        <button class="header mar-bot-8px" onClick={() => this.setState({ dialog: true })}>
          <h3>
            Danh sách phòng
            <br />
            Tháng {this.state.month} - {this.state.year}
          </h3>
        </button>
        <div class="list">
          {datas.map((data, idx) => {
            return (
              <button
                name={idx}
                className={this.buttonStatus(data.bills[0]).className}
                onClick={() => this.setState({ roomIndex: idx, showAll: false })}
              >
                {data.room}
                <br />
                {this.renderRoomGeneralInfo(data.bills)}
              </button>
            )
          })}
        </div>
        {this.renderListRoomsTable()}
        <button name="report" class="mar-top-8px" onClick={() => this.setState({ report: true })}>
          TỔNG HỢP THÁNG {this.state.month} - {this.state.year}
        </button>
      </div>
    )
  }

  renderSelectMonthYear = () => {
    return (
      <div class="app">
        <div class="flex col">
          <h1> Chọn Tháng / Năm </h1>
          {this.renderSelect('Năm', 'year', 'onYearSelect')}
          {this.renderSelect('Tháng', 'month', 'onMonthSelect')}
        </div>
        <button name="dialogok" class="large" onClick={this.btnClick}>
          OK
        </button>
        <button name="closedialog" class="large" onClick={() => this.setState({ dialog: false })}>
          HỦY
        </button>
        {this.renderLoading()}
      </div>
    )
  }

  renderLoading = () => {
    return (
      <div class="app">
        <div className={this.state.notice ? 'notice' : 'hidden'}>{this.state.notice}</div>
        <div className={this.state.loading ? 'spinner' : 'hidden'} style="width: 100%;">
          <div class="bounce1" />
          <div class="bounce2" />
          <div class="bounce3" />
        </div>
      </div>
    )
  }

  renderInput = (label, type, name, placeholder) => {
    return (
      <div class="flex align-items-end">
        <label for={name}>{label.toUpperCase()}</label>
        <div>
          <input
            type={type}
            name={name}
            value={this.state[name]}
            placeholder={placeholder ? placeholder : label}
            onInput={this.onInput}
          />
        </div>
      </div>
    )
  }

  validateRegistration = onlyUpdate => {
    let valid = this.state.dien && this.state.nuoc
    if (valid) {
      const dienkytruoc = this.state.datas[this.state.roomIndex].dien || 0
      valid = this.state.dien - dienkytruoc > -1
      const nuockytruoc = this.state.datas[this.state.roomIndex].nuoc || 0
      valid = this.state.nuoc - nuockytruoc > -1
    }
    if (!onlyUpdate) {
      valid = this.state.email && this.state.email.length > 1
      if (valid) {
        const re = /^[a-z0-9][a-z0-9-_\.]+@([a-z]|[a-z0-9]?[a-z0-9-]+[a-z0-9])\.[a-z0-9]{2,10}(?:\.[a-z]{2,10})?$/
        valid = re.test(this.state.email.toLowerCase())
      }
      valid = this.state.phone && this.state.phone.length > 9
      valid = this.state.deposit && this.state.deposit > 99999
    }
    return valid
  }

  renderBillUpdate = () => {
    return (
      <div class="app">
        <h1> Cập Nhật </h1>
        <div class="flex col">
          {this.renderInput('Điện', 'number', 'dien', 'Số điện mới')}
          {this.renderInput('Nước', 'number', 'nuoc', 'Số nước mới')}
          {this.renderInput(
            'Nhà',
            'number',
            'nha',
            `${this.state.datas[this.state.roomIndex].bills[0].nha}`
          )}
        </div>
        <button name="update" onClick={this.btnClick}>
          CẬP NHẬT
        </button>
        <button
          name={
            this.state.datas[this.state.roomIndex].bills[0].out ? 'bill-out-cancel' : 'bill-out'
          }
          onClick={this.btnClick}
        >
          {this.state.datas[this.state.roomIndex].bills[0].out ? 'HUỶ TRẢ PHÒNG' : 'TRẢ PHÒNG'}
        </button>
        <button onClick={() => this.setState({ update: false })}>QUAY LẠI</button>
        {this.renderLoading()}
      </div>
    )
  }

  renderRegistration = () => {
    return (
      <div class="app">
        <h2> Điền thông tin </h2>
        <div class="flex col">
          {this.renderInput('Tên', 'text', 'name')}
          {this.renderInput('ĐTDĐ', 'number', 'phone')}
          {this.renderInput('Email', 'email', 'email')}
          {this.renderInput('Điện', 'number', 'dien', 'Số điện')}
          {this.renderInput('Nước', 'number', 'nuoc', 'Số nước')}
          {this.renderInput('Cọc', 'number', 'deposit')}
        </div>
        <button name="in" onClick={this.btnClick} disabled={!this.validateRegistration()}>
          THÊM NGƯỜI MỚI
        </button>
        <button onClick={() => this.setState({ reg: false })}>QUAY LẠI</button>
        {this.renderLoading()}
      </div>
    )
  }

  renderLogin = () => {
    return (
      <div class="app">
        <h1> Hello! </h1>
        <div class="flex col">
          {this.renderInput('M.khẩu', 'password', 'pass', 'Mật khẩu')}
          {this.renderSelect('Năm', 'year', 'onYearSelect')}
          {this.renderSelect('Tháng', 'month', 'onMonthSelect')}
        </div>
        <button
          name="login"
          onClick={this.btnClick}
          disabled={!this.state.pass || this.state.loading}
        >
          ĐĂNG NHẬP
        </button>
        {this.renderLoading()}
      </div>
    )
  }

  calculateGrandTotal = datas => {
    const grandTotal = {
      tiennha: 0,
      phaithu: 0,
      dientieuthu: 0,
      tiendien: 0,
      nuoctieuthu: 0,
      tiennuoc: 0,
    }
    datas.map(data => {
      data.bills.map(bill => {
        grandTotal.phaithu += bill.tongcong
        grandTotal.tiendien += bill.dien.thanhtien
        grandTotal.tiennuoc += bill.nuoc.thanhtien
        grandTotal.nuoctieuthu += bill.nuoc.tieuthu
        grandTotal.dientieuthu += bill.dien.tieuthu
        grandTotal.tiennha += bill.nha
      })
    })
    return grandTotal
  }

  renderReport = datas => {
    const flaternBills = []
    datas.map(data => data.bills.map(bill => flaternBills.push(bill)))
    return (
      <table class="tg">
        <tr class="bold header" onClick={() => this.setState({ dialog: true })}>
          <th colspan="20">
            <h4>
              TIỀN NHÀ THÁNG {this.state.month} - {this.state.year}
            </h4>
          </th>
        </tr>
        <tr class="bold">
          <th rowspan="2">PHÒNG</th>
          <th rowspan="2">TIỀN NHÀ</th>
          <th colspan="5">ĐIỆN</th>
          <th colspan="5">NƯỚC</th>
          <th rowspan="2">RÁC</th>
          <th rowspan="2">CỘNG</th>
          <th rowspan="2">XÁC NHẬN</th>
        </tr>
        <tr class="bold">
          <td>Kỳ trước</td>
          <td>Kỳ này</td>
          <td>Tiêu thụ</td>
          <td>Giá</td>
          <td>Thành tiền</td>
          <td>Kỳ trước</td>
          <td>Kỳ này</td>
          <td>Tiêu thụ</td>
          <td>Giá</td>
          <td>Thành tiền</td>
        </tr>
        {flaternBills.map((d, i) => {
          return (
            <tr key={i}>
              <td>{d.room}</td>
              <td class="right bold">{d.nha.toLocaleString('vi')}</td>
              <td>{d.dien.sokytruoc.toLocaleString('vi')}</td>
              <td>{d.dien.sokynay.toLocaleString('vi')}</td>
              <td>{d.dien.tieuthu.toLocaleString('vi')}</td>
              <td>{d.dien.gia.toLocaleString('vi')}</td>
              <td class="right bold">{d.dien.thanhtien.toLocaleString('vi')}</td>
              <td>{d.nuoc.sokytruoc.toLocaleString('vi')}</td>
              <td>{d.nuoc.sokynay.toLocaleString('vi')}</td>
              <td>{d.nuoc.tieuthu.toLocaleString('vi')}</td>
              <td>{d.nuoc.gia.toLocaleString('vi')}</td>
              <td class="right bold">{d.nuoc.thanhtien.toLocaleString('vi')}</td>
              <td class="right bold">{d.rac.toLocaleString('vi')}</td>
              <td class="right bold">{d.tongcong.toLocaleString('vi')}</td>
              <td />
            </tr>
          )
        })}
        <tr class="bold header">
          <th colspan="2" onClick={() => window.print()}>
            <h4 class="no-print right">
              {this.calculateGrandTotal(datas).tiennha.toLocaleString('vi')}
            </h4>
          </th>
          <th colspan="2" onClick={() => window.print()} />
          <th colspan="1" onClick={() => window.print()}>
            <h4>{this.calculateGrandTotal(datas).dientieuthu.toLocaleString('vi')}</h4>
          </th>
          <th colspan="2" onClick={() => window.print()}>
            <h4 class="no-print right">
              {this.calculateGrandTotal(datas).tiendien.toLocaleString('vi')}
            </h4>
          </th>
          <th colspan="2" onClick={() => window.print()} />
          <th colspan="1" onClick={() => window.print()}>
            <h4>{this.calculateGrandTotal(datas).nuoctieuthu.toLocaleString('vi')}</h4>
          </th>
          <th colspan="2" onClick={() => window.print()}>
            <h4 class="no-print right">
              {this.calculateGrandTotal(datas).tiennuoc.toLocaleString('vi')}
            </h4>
          </th>
          <th colspan="2" onClick={() => window.print()}>
            <h4 class="no-print right">
              {this.calculateGrandTotal(datas).phaithu.toLocaleString('vi')}
            </h4>
          </th>
          <th onClick={() => this.setState({ report: false })}>
            <h4 class="no-print">{'<<<'}</h4>
          </th>
        </tr>
      </table>
    )
  }

  renderPage = (token, showAll, dialog, datas, report, reg, update) => {
    if (typeof window !== "undefined") window.scroll(0, 0)
    if (token) {
      if (dialog) return this.renderSelectMonthYear()
      else if (report) return this.renderReport(datas)
      else {
        if (datas.length) {
          if (showAll) return this.renderListRooms(datas)
          else if (reg) return this.renderRegistration()
          else if (update) return this.renderBillUpdate()
          else return this.renderRoom(datas)
        } else return this.renderLoading()
      }
    } else return this.renderLogin()
  }

  render({}, { token, showAll, dialog, datas, report, reg, ver, update }) {
    return (
      <div>
        {this.renderPage(token, showAll, dialog, datas, report, reg, update)}
        <div class="version">{ver}</div>
      </div>
    )
  }
}
